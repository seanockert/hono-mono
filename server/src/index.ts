import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { sql } from 'kysely';
import { admin } from './admin';
import { createAuth, parseUrlList } from './lib/auth';
import { createDb } from './lib/db';
import { fail, uniqueViolation } from './lib/errors';
import { requireAuth, type AuthVariables } from './lib/middleware';
import { getEnv, type AppEnv } from './lib/env';
import items from './routes/items';
import type { User } from 'shared';

const app = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

let corsMiddleware: ReturnType<typeof cors> | null = null;

app.use('*', async (c, next) => {
  if (!corsMiddleware) {
    const env = getEnv(c.env);
    const origins = [
      ...(env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : []),
      ...parseUrlList(env.CLIENT_URLS),
    ];

    corsMiddleware = cors({
      origin: (origin) => {
        if (origins.length === 0) return origin || '*';
        return origins.includes(origin) ? origin : '';
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      // Without this, a cross-origin client sends a preflight before each request.
      maxAge: 86400,
    });
  }

  return corsMiddleware(c, next);
});

const apiHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
  },
});

// /admin sets a stricter policy. secureHeaders writes after next(), so this
// instance would overwrite it.
app.use('*', (c, next) => (c.req.path.startsWith('/admin') ? next() : apiHeaders(c, next)));

app.onError(async (error, c) => {
  const column = uniqueViolation(error);
  if (column) return fail(c, 409, `That ${column.split('.').pop()} is already in use`);

  // csrf() and similar middleware throw HTTPException with the reason in the
  // response, not in the message. Without this branch, their 403 becomes a 500.
  if (error instanceof HTTPException) {
    const reason = error.message || (await error.getResponse().text());
    return fail(c, error.status, reason || 'Request failed');
  }

  console.error('Unhandled error:', error);
  return fail(c, 500, 'Internal server error');
});

app.notFound((c) => fail(c, 404, 'Not found'));

app.get('/', (c) => c.text('Hola!'));

// Also checks the database, because the Worker can work when D1 does not.
app.get('/health', async (c) => {
  let db = false;
  try {
    await sql`SELECT 1`.execute(createDb(getEnv(c.env)));
    db = true;
  } catch (error) {
    console.error('Health check: database unreachable', error);
  }
  return c.json({ ok: db, db }, db ? 200 : 503);
});

app.all('/api/auth/*', (c) => createAuth(getEnv(c.env)).handler(c.req.raw));

app.get('/api/protected', requireAuth, (c) =>
  c.json({
    message: 'Auth successful!',
    user: c.get('session').user as User,
    timestamp: new Date().toISOString(),
  }),
);

app.route('/api/items', items);

// Same origin as the API, so the session cookie works without CORS.
app.route('/admin', admin);

export default app;
