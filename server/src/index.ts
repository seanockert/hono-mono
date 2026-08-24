import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, parseUrlList } from './lib/auth';
import { requireAuth, type AuthVariables } from './lib/middleware';
import { getEnv, type AppEnv } from './lib/env';
import items from './routes/items';
import type { User } from 'shared';

export type { AppEnv } from './lib/env';
export { getEnv } from './lib/env';

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
    });
  }

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
app.get('/api/protected', requireAuth, (c) =>
  c.json({
    message: 'Auth successful!',
    user: c.get('session').user as User,
    timestamp: new Date().toISOString(),
  }),
);

// Items CRUD
app.route('/api/items', items);

export default app;
