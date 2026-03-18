import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/middleware';
import { getEnv, type AppEnv } from '../lib/env';
import { slugify, UUID_REGEX } from '../lib/utils';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  content: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const items = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

// GET / — paginated list with filtering and sorting
items.get('/', zValidator('query', listSchema), async (c) => {
  const { page, limit, search, status, sortBy, sortOrder } = c.req.valid('query');
  const db = createDb(getEnv(c.env));
  const offset = (page - 1) * limit;

  let query = db.selectFrom('item').selectAll();
  let countQuery = db
    .selectFrom('item')
    .select((eb) => eb.fn.countAll<number>().as('count'));

  if (search) {
    const pattern = `%${search}%`;
    query = query.where((eb) =>
      eb.or([eb('title', 'like', pattern), eb('content', 'like', pattern)]),
    );
    countQuery = countQuery.where((eb) =>
      eb.or([eb('title', 'like', pattern), eb('content', 'like', pattern)]),
    );
  }

  if (status) {
    query = query.where('status', '=', status);
    countQuery = countQuery.where('status', '=', status);
  }

  query = query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

  const [rows, countRow] = await Promise.all([query.execute(), countQuery.executeTakeFirst()]);
  const total = Number(countRow?.count ?? 0);

  return c.json({
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /:idOrSlug — fetch by UUID or slug
items.get('/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const db = createDb(getEnv(c.env));

  const item = UUID_REGEX.test(idOrSlug)
    ? await db.selectFrom('item').selectAll().where('id', '=', idOrSlug).executeTakeFirst()
    : await db.selectFrom('item').selectAll().where('slug', '=', idOrSlug).executeTakeFirst();

  if (!item) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json(item);
});

// POST / — create item (auth required)
items.post('/', requireAuth, zValidator('json', createSchema), async (c) => {
  const { title, content, status } = c.req.valid('json');
  const session = c.get('session');
  const db = createDb(getEnv(c.env));
  const now = new Date().toISOString();

  // Generate unique slug
  let slug = slugify(title);
  let existing = await db.selectFrom('item').select('id').where('slug', '=', slug).executeTakeFirst();
  let counter = 2;
  while (existing) {
    slug = `${slugify(title)}-${counter++}`;
    existing = await db.selectFrom('item').select('id').where('slug', '=', slug).executeTakeFirst();
  }

  const id = crypto.randomUUID();
  await db
    .insertInto('item')
    .values({
      id,
      title,
      slug,
      content: content ?? null,
      status,
      authorId: session.user.id,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  const item = await db.selectFrom('item').selectAll().where('id', '=', id).executeTakeFirst();
  return c.json(item, 201);
});

// PUT /:id — partial update (auth required)
items.put('/:id', requireAuth, zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id');
  const updates = c.req.valid('json');
  const db = createDb(getEnv(c.env));

  const existing = await db.selectFrom('item').selectAll().where('id', '=', id).executeTakeFirst();
  if (!existing) {
    return c.json({ error: 'Not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, string | null> = { updatedAt: now };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content ?? null;
  if (updates.status !== undefined) updateData.status = updates.status;

  if (updates.slug !== undefined) {
    updateData.slug = updates.slug;
  } else if (updates.title !== undefined) {
    let slug = slugify(updates.title);
    let conflict = await db
      .selectFrom('item')
      .select('id')
      .where('slug', '=', slug)
      .where('id', '!=', id)
      .executeTakeFirst();
    let counter = 2;
    while (conflict) {
      slug = `${slugify(updates.title)}-${counter++}`;
      conflict = await db
        .selectFrom('item')
        .select('id')
        .where('slug', '=', slug)
        .where('id', '!=', id)
        .executeTakeFirst();
    }
    updateData.slug = slug;
  }

  await db.updateTable('item').set(updateData).where('id', '=', id).execute();

  const updated = await db.selectFrom('item').selectAll().where('id', '=', id).executeTakeFirst();
  return c.json(updated);
});

// DELETE /:id — hard delete (auth required)
items.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const db = createDb(getEnv(c.env));

  const result = await db.deleteFrom('item').where('id', '=', id).execute();
  if (result[0]?.numDeletedRows === 0n) {
    return c.json({ error: 'Not found' }, 404);
  }

  return new Response(null, { status: 204 });
});

export default items;
