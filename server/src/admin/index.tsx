import { Hono } from 'hono';
import type { Context } from 'hono';
import { csrf } from 'hono/csrf';
import { createMiddleware } from 'hono/factory';
import { NONCE, secureHeaders } from 'hono/secure-headers';
import { createAuth } from '../lib/auth';
import { getEnv, type AppEnv } from '../lib/env';
import type { AuthVariables } from '../lib/middleware';
import { ADMIN_MODELS } from '../lib/models';
import { notFoundPage, page } from './layout';
import { records } from './records';
import { users } from './users';

type Env = { Bindings: AppEnv; Variables: AuthVariables };

const HOME = `/admin/${ADMIN_MODELS[0] ?? 'users'}`;

const loginPage = (c: Context<Env>, notice?: string) =>
  page(c, {
    title: 'Sign in',
    children: (
      <>
        <h1>Admin</h1>
        {notice ? <div class="notice">{notice}</div> : null}
        <form method="post" action="/admin/login">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autofocus required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button type="submit" class="primary">
            Sign in
          </button>
        </form>
      </>
    ),
  });

/** Not `requireAuth`: that answers JSON 401, no use to a browser. */
const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const session = await createAuth(getEnv(c.env)).api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.status(401);
    return loginPage(c);
  }

  if (session.user.role !== 'admin') {
    c.status(403);
    return page(c, {
      title: 'Forbidden',
      children: (
        <>
          <h1>Forbidden</h1>
          <p class="muted">This account is not an admin.</p>
          <form method="post" action="/admin/logout">
            <button type="submit">Sign out</button>
          </form>
        </>
      ),
    });
  }

  c.set('session', session as AuthVariables['session']);
  await next();
});

const redirectWithCookies = (from: Response, location: string) => {
  const headers = new Headers({ Location: location });
  for (const cookie of from.headers.getSetCookie()) headers.append('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
};

export const admin = new Hono<Env>();

admin.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: [NONCE],
      imgSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }),
  csrf(),
);

// Above the guard: signing in cannot need a session. Add new routes below it.
admin.post('/login', async (c) => {
  const body = await c.req.parseBody();

  // Through the handler, not auth.api: only the handler rate limits, so a direct
  // api call leaves this open to password guessing. Original headers carry the
  // client IP and Origin. The old content-length describes the form body.
  const headers = new Headers(c.req.raw.headers);
  headers.set('content-type', 'application/json');
  headers.delete('content-length');

  const response = await createAuth(getEnv(c.env)).handler(
    new Request(new URL('/api/auth/sign-in/email', c.req.url), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: String(body.email ?? ''),
        password: String(body.password ?? ''),
      }),
    }),
  );

  if (response.ok) return redirectWithCookies(response, HOME);

  // A bad password comes back as a 401 response, not a thrown error.
  const tooMany = response.status === 429;
  c.status(tooMany ? 429 : 401);
  return loginPage(
    c,
    tooMany
      ? 'Too many sign-in attempts. Wait a moment and try again.'
      : 'Invalid email or password.',
  );
});

// Also above the guard: behind it, a non-admin could never sign out.
admin.post('/logout', async (c) => {
  const response = await createAuth(getEnv(c.env)).api.signOut({
    headers: c.req.raw.headers,
    asResponse: true,
  });
  return redirectWithCookies(response, '/admin');
});

admin.use('*', requireAdmin);

admin.get('/', (c) => c.redirect(HOME, 302));
admin.get('/login', (c) => c.redirect(HOME, 302));

// Users first: "/users" would otherwise be read as a model name.
admin.route('/', users);
admin.route('/', records);

// Last, so anything else under /admin gets the HTML 404 and not the JSON one.
admin.all('*', (c) => notFoundPage(c, c.get('session').user.email));
