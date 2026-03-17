import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, parseUrlList } from './lib/auth';
import type { User } from 'shared';

export type AppEnv = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CLIENT_URLS?: string;
  DATABASE?: unknown;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

/** Merge Cloudflare bindings (c.env) with process.env for Bun/Node */
export const getEnv = (bindings: AppEnv): AppEnv => ({
  ...Object.fromEntries(
    Object.keys(bindings).length > 0
      ? Object.entries(bindings)
      : Object.entries(process.env).filter(([k]) =>
          ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'CLIENT_URLS', 'DATABASE', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'].includes(k),
        ),
  ),
});

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

export default app;
