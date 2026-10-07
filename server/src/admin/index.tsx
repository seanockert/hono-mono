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

/** Not `requireAuth`, which sends a JSON 401. A browser needs an HTML page. */
const requireAdmin = createMiddleware<Env>(async (c, next) => {
  // No cookie cache, so that a ban or a role change applies at once.
  const session = await createAuth(getEnv(c.env)).api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
  });

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

  c.set('session', session);
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

// Before the guard, because sign-in has no session. Add new routes after the guard.
admin.post('/login', async (c) => {
  const body = await c.req.parseBody();

  // Use the handler, not auth.api. Only the handler applies the rate limit that
  // stops password guessing. Keep the original headers for client IP and Origin.
  // Remove content-length, because it is the length of the form body.
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

  // A bad password gives a 401 response. It does not throw.
  const tooMany = response.status === 429;
  c.status(tooMany ? 429 : 401);
  return loginPage(
    c,
    tooMany
      ? 'Too many sign-in attempts. Wait a moment and try again.'
      : 'Invalid email or password.',
  );
});

// Before the guard, so that a non-admin can sign out.
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

// Users first. Otherwise "/users" matches as a model name.
admin.route('/', users);
admin.route('/', records);

// Last. All other /admin paths get the HTML 404, not the JSON 404.
admin.all('*', (c) => notFoundPage(c, c.get('session').user.email));
