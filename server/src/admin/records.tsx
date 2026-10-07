import { Hono } from 'hono';
import type { Context } from 'hono';
import type { FC } from 'hono/jsx';
import { listRows, STATUS, uniqueSlug, type CrudDb, type CrudTableName } from '../lib/crud';
import { createDb, type CrudTable } from '../lib/db';
import { getEnv, type AppEnv } from '../lib/env';
import { uniqueViolation } from '../lib/errors';
import type { AuthVariables } from '../lib/middleware';
import { isAdminModel, modelLabel } from '../lib/models';
import { slugify } from '../lib/utils';
import { notFoundPage, page } from './layout';

const PAGE_SIZE = 20;

type Env = { Bindings: AppEnv; Variables: AuthVariables };

const getDb = (c: Context<Env>) => createDb(getEnv(c.env)) as unknown as CrudDb;
const email = (c: Context<Env>) => c.get('session').user.email;

const table = (c: Context<Env>): CrudTableName | null => {
  const name = c.req.param('model');
  return name && isAdminModel(name) ? name : null;
};

const listQuery = (search: string, status: string, page?: number) => {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  if (page && page > 1) query.set('page', String(page));
  const text = query.toString();
  return text ? `?${text}` : '';
};

/** Only the form fields, so that the page can show a rejected save again. */
type FormRow = Pick<CrudTable, 'id' | 'title' | 'slug' | 'content' | 'status'>;

const Form: FC<{ model: string; row?: FormRow }> = ({ model, row }) => (
  <form method="post" action={row ? `/admin/${model}/${row.id}` : `/admin/${model}`}>
    <div class="field">
      <label for="title">Title</label>
      <input id="title" name="title" value={row?.title} required />
    </div>

    {row ? (
      <div class="field">
        <label for="slug">Slug</label>
        <input id="slug" name="slug" value={row.slug} required />
      </div>
    ) : null}

    <div class="field">
      <label for="status">Status</label>
      <select id="status" name="status">
        {STATUS.map((value) => (
          <option value={value} selected={row ? row.status === value : value === 'draft'}>
            {value}
          </option>
        ))}
      </select>
    </div>

    <div class="field">
      <label for="content">Content</label>
      <textarea id="content" name="content">
        {row?.content ?? ''}
      </textarea>
    </div>

    <div class="row">
      <button type="submit" class="primary">
        {row ? 'Save changes' : 'Create'}
      </button>
      <a href={`/admin/${model}`}>Cancel</a>
    </div>
  </form>
);

const editPage = (c: Context<Env>, model: string, row: FormRow, notice?: string) =>
  page(c, {
    title: row.title,
    email: email(c),
    children: (
      <>
        <h1>Edit {model}</h1>
        {notice ? <div class="notice">{notice}</div> : null}
        <Form model={model} row={row} />
      </>
    ),
  });

export const records = new Hono<Env>();

records.get('/:model', async (c) => {
  const model = table(c);
  if (!model) return notFoundPage(c, email(c));

  const search = c.req.query('search') ?? '';
  const status = STATUS.find((value) => value === c.req.query('status')) ?? '';
  const current = Math.max(1, Number(c.req.query('page')) || 1);

  const { data, total } = await listRows(getDb(c), model, {
    page: current,
    limit: PAGE_SIZE,
    search,
    status: status || undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return page(c, {
    title: modelLabel(model),
    email: email(c),
    children: (
      <>
        <h1>{modelLabel(model)}</h1>

        <form method="get" action={`/admin/${model}`} class="row">
          <label for="search" class="muted">
            Search
          </label>
          <input id="search" name="search" value={search} />
          <label for="status" class="muted">
            Status
          </label>
          <select id="status" name="status">
            <option value="">any</option>
            {STATUS.map((value) => (
              <option value={value} selected={status === value}>
                {value}
              </option>
            ))}
          </select>
          <button type="submit">Apply</button>
          <a href={`/admin/${model}/new`}>New</a>
        </form>

        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colspan={5} class="muted">
                  Nothing here yet.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr>
                  <td>
                    <a href={`/admin/${model}/${row.id}`}>{row.title}</a>
                  </td>
                  <td class="muted">{row.slug}</td>
                  <td>{row.status}</td>
                  <td class="muted">{new Date(row.updatedAt).toLocaleDateString('en-GB')}</td>
                  <td>
                    <form method="post" action={`/admin/${model}/${row.id}/delete`}>
                      <button type="submit" class="danger">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div class="row">
          <div class="muted">
            {total} total, page {current} of {pages}
          </div>
          {current > 1 ? (
            <a href={`/admin/${model}${listQuery(search, status, current - 1)}`}>Previous</a>
          ) : null}
          {current < pages ? (
            <a href={`/admin/${model}${listQuery(search, status, current + 1)}`}>Next</a>
          ) : null}
        </div>
      </>
    ),
  });
});

records.get('/:model/new', (c) => {
  const model = table(c);
  if (!model) return notFoundPage(c, email(c));

  return page(c, {
    title: `New ${model}`,
    email: email(c),
    children: (
      <>
        <h1>New {model}</h1>
        <Form model={model} />
      </>
    ),
  });
});

records.post('/:model', async (c) => {
  const model = table(c);
  if (!model) return notFoundPage(c, email(c));

  const body = await c.req.parseBody();
  const title = String(body.title ?? '').trim();
  if (!title) return c.redirect(`/admin/${model}/new`, 303);

  const content = String(body.content ?? '');
  const status = STATUS.find((value) => value === body.status) ?? 'draft';
  const now = new Date().toISOString();
  const db = getDb(c);

  await db
    .insertInto(model)
    .values({
      id: crypto.randomUUID(),
      title,
      slug: await uniqueSlug(db, model, title),
      content: content || null,
      status,
      authorId: c.get('session').user.id,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  return c.redirect(`/admin/${model}`, 303);
});

records.get('/:model/:id', async (c) => {
  const model = table(c);
  if (!model) return notFoundPage(c, email(c));

  const row = await getDb(c)
    .selectFrom(model)
    .selectAll()
    .where('id', '=', c.req.param('id'))
    .executeTakeFirst();

  if (!row) return notFoundPage(c, email(c));

  return editPage(c, model, row);
});

records.post('/:model/:id', async (c) => {
  const model = table(c);
  if (!model) return notFoundPage(c, email(c));

  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const title = String(body.title ?? '').trim();
  if (!title) return c.redirect(`/admin/${model}/${id}`, 303);

  const db = getDb(c);
  const slug = slugify(String(body.slug ?? '')) || (await uniqueSlug(db, model, title, id));
  const content = String(body.content ?? '');
  const status = STATUS.find((value) => value === body.status) ?? 'draft';

  try {
    await db
      .updateTable(model)
      .set({
        title,
        slug,
        content: content || null,
        status,
        updatedAt: new Date().toISOString(),
      })
      .where('id', '=', id)
      .execute();
  } catch (error) {
    if (!uniqueViolation(error)) throw error;
    c.status(409);
    return editPage(
      c,
      model,
      { id, title, slug, content: content || null, status },
      'Another record already uses that slug.',
    );
  }

  return c.redirect(`/admin/${model}`, 303);
});

records.post('/:model/:id/delete', async (c) => {
  const model = table(c);
  if (!model) return notFoundPage(c, email(c));

  await getDb(c).deleteFrom(model).where('id', '=', c.req.param('id')).execute();
  return c.redirect(`/admin/${model}`, 303);
});
