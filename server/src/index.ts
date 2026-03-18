import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, parseUrlList } from './lib/auth';
import { getEnv, type AppEnv } from './lib/env';
import items from './routes/items';
import type { User } from 'shared';

export type { AppEnv } from './lib/env';
export { getEnv } from './lib/env';

const app = new Hono<{ Bindings: AppEnv }>();

app.use('*', async (c, next) => {
  const env = getEnv(c.env);
  const origins: string[] = [];
  if (env.BETTER_AUTH_URL) origins.push(env.BETTER_AUTH_URL);
  if (env.CLIENT_URLS) origins.push(...parseUrlList(env.CLIENT_URLS));

  const corsMiddleware = cors({
    origin: (origin) => {
      if (origins.length === 0) return origin || '*';
      return origins.includes(origin) ? origin : '';
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });

  return corsMiddleware(c, next);
});

// Base route
app.get('/', (c) => c.text('Hola!'));

// Auth routes
app.all('/api/auth/*', async (c) => {
  try {
    const auth = createAuth(getEnv(c.env));
    return await auth.handler(c.req.raw);
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Protected endpoint example
app.get('/api/protected', async (c) => {
  const auth = createAuth(getEnv(c.env));
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorised' }, 401);
  }

  return c.json({
    message: 'Auth successful!',
    user: session.user as User,
    timestamp: new Date().toISOString(),
  });
});

// Items CRUD
app.route('/api/items', items);

export default app;
