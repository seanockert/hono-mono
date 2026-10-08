import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql, type Expression, type ExpressionBuilder, type Kysely, type SqlBool } from 'kysely';
import { STATUS } from 'shared';
import { createAuth } from './auth';
import { createDb, type AppDatabase, type CrudTable } from './db';
import { fail } from './errors';
import { limitWrites, requireAuth, type AuthVariables, type Session } from './middleware';
import { getEnv, type AppEnv } from './env';
import { slugify, UUID_REGEX } from './utils';

export type CrudTableName = {
  [K in keyof AppDatabase]: AppDatabase[K] extends CrudTable ? K : never;
}[keyof AppDatabase] &
  string;

// All CRUD tables have the same columns, so queries use one shared table type.
type CrudSchema = Record<string, CrudTable>;
export type CrudDb = Kysely<CrudSchema>;

type Env = { Bindings: AppEnv; Variables: AuthVariables };
type User = Session['user'];
type Filter = (eb: ExpressionBuilder<CrudSchema, string>) => Expression<SqlBool>;
type Restrictable<T> = { where(column: 'id' | 'authorId', op: '=', value: string): T };

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(STATUS).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListQuery = z.infer<typeof listSchema>;

const baseCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  status: z.enum(STATUS).default('draft'),
});

const baseUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z
    .string()
    .transform(slugify)
    .pipe(z.string().min(1, 'Slug must contain a letter or a digit'))
    .optional(),
  content: z.string().nullable().optional(),
  status: z.enum(STATUS).optional(),
});

/** Sends a failed validation as `{ error }`, the same as all other errors. */
const onInvalid = (
  result: { success: true } | { success: false; error: z.core.$ZodError },
  c: Context,
) =>
  result.success
    ? undefined
    : fail(
        c,
        400,
        result.error.issues
          .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
          .join('; '),
      );

export const uniqueSlug = async (db: CrudDb, table: string, title: string, excludeId?: string) => {
  const base = slugify(title) || 'untitled';
  let query = db.selectFrom(table).select('slug').where('slug', 'like', `${base}%`);
  if (excludeId) query = query.where('id', '!=', excludeId);

  const taken = new Set((await query.execute()).map((row) => row.slug));
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

/** Gives one page of rows and the total. `scope` limits the rows that the caller can see. */
export const listRows = async (db: CrudDb, table: string, query: ListQuery, scope?: Filter) => {
  const { page, limit, search, status, sortBy, sortOrder } = query;
  const filters: Filter[] = scope ? [scope] : [];

  if (search) {
    // Escape the LIKE wildcards, so that "50%" finds the text "50%".
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const like = (column: string) => sql<SqlBool>`${sql.ref(column)} LIKE ${pattern} ESCAPE '\\'`;
    filters.push((eb) => eb.or([like('title'), like('content')]));
  }
  if (status) filters.push((eb) => eb('status', '=', status));

  let rows = db.selectFrom(table).selectAll();
  let count = db.selectFrom(table).select((eb) => eb.fn.countAll<number>().as('count'));
  for (const filter of filters) {
    rows = rows.where(filter);
    count = count.where(filter);
  }

  const [data, countRow] = await Promise.all([
    rows
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),
    count.executeTakeFirst(),
  ]);

  return { data, total: Number(countRow?.count ?? 0) };
};

/** Published rows are public. Authors also see their own rows. Admins see all rows. */
const readable = (user?: User): Filter | undefined => {
  if (user?.role === 'admin') return undefined;
  return (eb) =>
    user
      ? eb.or([eb('status', '=', 'published'), eb('authorId', '=', user.id)])
      : eb('status', '=', 'published');
};

const viewer = async (c: Context<Env>) =>
  (await createAuth(getEnv(c.env)).api.getSession({ headers: c.req.raw.headers }))?.user;

/** Limits a write to rows of the caller. Admins can write all rows. */
const restrict = <T extends Restrictable<T>>(query: T, id: string, user: User): T => {
  const byId = query.where('id', '=', id);
  return user.role === 'admin' ? byId : byId.where('authorId', '=', user.id);
};

/** 404 if the row is missing. 403 if the row exists but is not the caller's. */
const refuse = async (db: CrudDb, table: string, id: string) => {
  const found = await db.selectFrom(table).select('id').where('id', '=', id).executeTakeFirst();
  return found
    ? ({ error: 'Forbidden', status: 403 } as const)
    : ({ error: 'Not found', status: 404 } as const);
};

/** Columns that the factory sets. Extra fields must not use these names. */
type BaseColumn = keyof CrudTable;

/**
 * Makes the CRUD routes for `table`. `fields` adds the columns of the model that are
 * not in `CrudTable`, for example `{ price: z.number() }`. Create needs them. Update
 * accepts each one alone.
 *
 * Hono matches routes in registration order. Register custom routes before these,
 * or `GET /:idOrSlug` catches them.
 */
export const createCrudRoutes = <
  T extends CrudTableName,
  F extends z.ZodRawShape & Partial<Record<BaseColumn, never>> = Record<never, never>,
>(
  model: T,
  fields: F = {} as F,
) => {
  type Row = AppDatabase[T];
  // A plain string, because Kysely cannot resolve its types for a generic table name.
  const table: string = model;
  const getDb = (env: AppEnv) => createDb(env) as unknown as CrudDb;
  const createSchema = baseCreateSchema.extend(fields);
  const updateSchema = baseUpdateSchema.extend(z.object(fields).partial().shape);

  return new Hono<Env>()
    .get('/', zValidator('query', listSchema, onInvalid), async (c) => {
      const query = c.req.valid('query');
      const db = getDb(getEnv(c.env));
      const { data, total } = await listRows(db, table, query, readable(await viewer(c)));
      const { page, limit } = query;
      return c.json({
        data: data as Row[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    })
    .get('/:idOrSlug', async (c) => {
      const idOrSlug = c.req.param('idOrSlug');
      const scope = readable(await viewer(c));

      let query = getDb(getEnv(c.env))
        .selectFrom(table)
        .selectAll()
        .where(UUID_REGEX.test(idOrSlug) ? 'id' : 'slug', '=', idOrSlug);
      if (scope) query = query.where(scope);

      const row = await query.executeTakeFirst();
      return row ? c.json(row as Row, 200) : fail(c, 404, 'Not found');
    })
    .post('/', requireAuth, limitWrites, zValidator('json', createSchema, onInvalid), async (c) => {
      // The base shape. The generic type of `fields` hides it from TypeScript.
      const { title, content, status, ...extra } = c.req.valid('json') as unknown as z.infer<
        typeof baseCreateSchema
      >;
      const db = getDb(getEnv(c.env));
      const now = new Date().toISOString();

      const row = await db
        .insertInto(table)
        .values({
          ...extra,
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

      return c.json(row as Row, 201);
    })
    .put(
      '/:id',
      requireAuth,
      limitWrites,
      zValidator('json', updateSchema, onInvalid),
      async (c) => {
        const id = c.req.param('id');
        const { slug, ...updates } = c.req.valid('json') as z.infer<typeof baseUpdateSchema>;
        const db = getDb(getEnv(c.env));

        // Leave out the keys that are undefined. Kysely writes NULL for them.
        const values: Partial<CrudTable> = Object.fromEntries(
          Object.entries(updates).filter(([, value]) => value !== undefined),
        );
        values.updatedAt = new Date().toISOString();

        if (slug !== undefined) {
          values.slug = slug;
        } else if (updates.title !== undefined) {
          values.slug = await uniqueSlug(db, table, updates.title, id);
        }

        const query = restrict(db.updateTable(table).set(values), id, c.get('session').user);
        const row = await query.returningAll().executeTakeFirst();
        if (row) return c.json(row as Row, 200);

        const { error, status } = await refuse(db, table, id);
        return fail(c, status, error);
      },
    )
    .delete('/:id', requireAuth, limitWrites, async (c) => {
      const id = c.req.param('id');
      const db = getDb(getEnv(c.env));

      const query = restrict(db.deleteFrom(table), id, c.get('session').user);
      const row = await query.returningAll().executeTakeFirst();
      if (row) return c.body(null, 204);

      const { error, status } = await refuse(db, table, id);
      return fail(c, status, error);
    });
};
