import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ExpressionBuilder, Kysely } from 'kysely';
import { createDb, type AppDatabase, type CrudTable } from './db';
import { requireAuth, type AuthVariables } from './middleware';
import { getEnv, type AppEnv } from './env';
import { slugify, UUID_REGEX } from './utils';

export type CrudTableName = {
  [K in keyof AppDatabase]: AppDatabase[K] extends CrudTable ? K : never;
}[keyof AppDatabase] &
  string;

// Every CRUD table has the same columns, so queries build against one shared
// table type instead of each concrete one.
type CrudSchema = Record<string, CrudTable>;
export type CrudDb = Kysely<CrudSchema>;

type Restrictable<T> = { where(column: 'id' | 'authorId', op: '=', value: string): T };

const STATUS = ['draft', 'published', 'archived'] as const;

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(STATUS).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  status: z.enum(STATUS).default('draft'),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().nullable().optional(),
  status: z.enum(STATUS).optional(),
});

export const uniqueSlug = async (db: CrudDb, table: string, title: string, excludeId?: string) => {
  const base = slugify(title);
  let query = db.selectFrom(table).select('slug').where('slug', 'like', `${base}%`);
  if (excludeId) query = query.where('id', '!=', excludeId);

  const taken = new Set((await query.execute()).map((row) => row.slug));
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

/** Narrows a write to rows the caller owns. Admins keep all rows. */
const restrict = <T extends Restrictable<T>>(
  query: T,
  id: string,
  user: AuthVariables['session']['user'],
): T => {
  const byId = query.where('id', '=', id);
  return user.role === 'admin' ? byId : byId.where('authorId', '=', user.id);
};

/** 404 if the row is missing, 403 if it exists but is not the caller's. */
const refuse = async (db: CrudDb, table: string, id: string) => {
  const found = await db.selectFrom(table).select('id').where('id', '=', id).executeTakeFirst();
  return found
    ? ({ error: 'Forbidden', status: 403 } as const)
    : ({ error: 'Not found', status: 404 } as const);
};

// Hono matches in registration order: register custom routes before mounting
// these, or `GET /:idOrSlug` shadows them.
export const createCrudRoutes = (table: CrudTableName) => {
  const routes = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();
  const getDb = (env: AppEnv) => createDb(env) as unknown as CrudDb;

  routes.get('/', zValidator('query', listSchema), async (c) => {
    const { page, limit, search, status, sortBy, sortOrder } = c.req.valid('query');
    const db = getDb(getEnv(c.env));

    let rows = db.selectFrom(table).selectAll();
    let count = db.selectFrom(table).select((eb) => eb.fn.countAll<number>().as('count'));

    if (search) {
      const pattern = `%${search}%`;
      const matches = (eb: ExpressionBuilder<CrudSchema, string>) =>
        eb.or([eb('title', 'like', pattern), eb('content', 'like', pattern)]);
      rows = rows.where(matches);
      count = count.where(matches);
    }

    if (status) {
      rows = rows.where('status', '=', status);
      count = count.where('status', '=', status);
    }

    const [data, countRow] = await Promise.all([
      rows
        .orderBy(sortBy, sortOrder)
        .limit(limit)
        .offset((page - 1) * limit)
        .execute(),
      count.executeTakeFirst(),
    ]);

    const total = Number(countRow?.count ?? 0);
    return c.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  });

  routes.get('/:idOrSlug', async (c) => {
    const idOrSlug = c.req.param('idOrSlug');

    const row = await getDb(getEnv(c.env))
      .selectFrom(table)
      .selectAll()
      .where(UUID_REGEX.test(idOrSlug) ? 'id' : 'slug', '=', idOrSlug)
      .executeTakeFirst();

    return row ? c.json(row) : c.json({ error: 'Not found' }, 404);
  });

  routes.post('/', requireAuth, zValidator('json', createSchema), async (c) => {
    const { title, content, status } = c.req.valid('json');
    const db = getDb(getEnv(c.env));
    const now = new Date().toISOString();

    const row = await db
      .insertInto(table)
      .values({
        id: crypto.randomUUID(),
        title,
        slug: await uniqueSlug(db, table, title),
        content: content ?? null,
        status,
        authorId: c.get('session').user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return c.json(row, 201);
  });

  routes.put('/:id', requireAuth, zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id');
    const updates = c.req.valid('json');
    const db = getDb(getEnv(c.env));

    const values: Partial<CrudTable> = { updatedAt: new Date().toISOString() };
    if (updates.title !== undefined) values.title = updates.title;
    if (updates.content !== undefined) values.content = updates.content;
    if (updates.status !== undefined) values.status = updates.status;

    if (updates.slug !== undefined) {
      values.slug = updates.slug;
    } else if (updates.title !== undefined) {
      values.slug = await uniqueSlug(db, table, updates.title, id);
    }

    const query = restrict(db.updateTable(table).set(values), id, c.get('session').user);
    const row = await query.returningAll().executeTakeFirst();
    if (row) return c.json(row);

    const { error, status } = await refuse(db, table, id);
    return c.json({ error }, status);
  });

  routes.delete('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const db = getDb(getEnv(c.env));

    const query = restrict(db.deleteFrom(table), id, c.get('session').user);
    const row = await query.returningAll().executeTakeFirst();
    if (row) return new Response(null, { status: 204 });

    const { error, status } = await refuse(db, table, id);
    return c.json({ error }, status);
  });

  return routes;
};
