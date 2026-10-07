import { Hono } from 'hono';
import type { Context } from 'hono';
import { createAuth } from '../lib/auth';
import { getEnv, type AppEnv } from '../lib/env';
import type { AuthVariables } from '../lib/middleware';
import { page } from './layout';

const PAGE_SIZE = 25;

type Env = { Bindings: AppEnv; Variables: AuthVariables };

const auth = (c: Context<Env>) => createAuth(getEnv(c.env));

const backWithError = (c: Context<Env>, message: string) =>
  c.redirect(`/admin/users?error=${encodeURIComponent(message)}`, 303);

// Refuses actions on the account of the caller. Better Auth allows them, and the
// list only hides the buttons. Without this check, an admin can delete their own account.
const act = async (c: Context<Env>, run: (userId: string) => Promise<unknown>) => {
  const userId = c.req.param('id') ?? '';
  if (userId === c.get('session').user.id) {
    return backWithError(c, 'That action cannot target your own account.');
  }

  try {
    await run(userId);
    return c.redirect('/admin/users', 303);
  } catch (error) {
    return backWithError(c, error instanceof Error ? error.message : 'That action failed');
  }
};

export const users = new Hono<Env>();

users.get('/users', async (c) => {
  const search = c.req.query('search') ?? '';
  const current = Math.max(1, Number(c.req.query('page')) || 1);
  const notice = c.req.query('error') ?? '';
  const me = c.get('session').user;

  const result = await auth(c).api.listUsers({
    query: {
      limit: PAGE_SIZE,
      offset: (current - 1) * PAGE_SIZE,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      ...(search ? { searchField: 'email' as const, searchValue: search } : {}),
    },
    headers: c.req.raw.headers,
  });

  const rows = 'users' in result ? result.users : [];
  const total = 'total' in result ? result.total : rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (n: number) =>
    `/admin/users?${new URLSearchParams({ ...(search ? { search } : {}), page: String(n) })}`;

  return page(c, {
    title: 'Users',
    email: me.email,
    children: (
      <>
        <h1>Users</h1>

        {notice ? <div class="notice">{notice}</div> : null}

        <form method="get" action="/admin/users" class="row">
          <label for="search" class="muted">
            Search by email
          </label>
          <input id="search" name="search" value={search} />
          <button type="submit">Search</button>
        </form>

        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colspan={5} class="muted">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((user) => {
                const isMe = user.id === me.id;
                return (
                  <tr>
                    <td>{user.email}</td>
                    <td class="muted">{user.name || '-'}</td>
                    <td>
                      {isMe ? (
                        <div class="muted">{user.role ?? 'user'} (you)</div>
                      ) : (
                        <form method="post" action={`/admin/users/${user.id}/role`} class="row">
                          <label for={`role-${user.id}`} hidden>
                            Role
                          </label>
                          <select id={`role-${user.id}`} name="role">
                            <option value="user" selected={user.role !== 'admin'}>
                              user
                            </option>
                            <option value="admin" selected={user.role === 'admin'}>
                              admin
                            </option>
                          </select>
                          <button type="submit">Save</button>
                        </form>
                      )}
                    </td>
                    <td>{user.banned ? 'banned' : 'active'}</td>
                    <td>
                      {isMe ? null : (
                        <div class="row">
                          <form
                            method="post"
                            action={`/admin/users/${user.id}/${user.banned ? 'unban' : 'ban'}`}
                          >
                            <button type="submit">{user.banned ? 'Unban' : 'Ban'}</button>
                          </form>
                          <form method="post" action={`/admin/users/${user.id}/delete`}>
                            <button type="submit" class="danger">
                              Delete
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div class="row">
          <div class="muted">
            {total} total, page {current} of {pages}
          </div>
          {current > 1 ? <a href={pageLink(current - 1)}>Previous</a> : null}
          {current < pages ? <a href={pageLink(current + 1)}>Next</a> : null}
        </div>
      </>
    ),
  });
});

users.post('/users/:id/role', async (c) => {
  const body = await c.req.parseBody();
  const role = body.role === 'admin' ? 'admin' : 'user';

  return act(c, (userId) =>
    auth(c).api.setRole({ body: { userId, role }, headers: c.req.raw.headers }),
  );
});

users.post('/users/:id/ban', (c) =>
  act(c, (userId) => auth(c).api.banUser({ body: { userId }, headers: c.req.raw.headers })),
);

users.post('/users/:id/unban', (c) =>
  act(c, (userId) => auth(c).api.unbanUser({ body: { userId }, headers: c.req.raw.headers })),
);

users.post('/users/:id/delete', (c) =>
  act(c, (userId) => auth(c).api.removeUser({ body: { userId }, headers: c.req.raw.headers })),
);
