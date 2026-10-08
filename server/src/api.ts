import { Hono } from 'hono';
import type { AppEnv } from './lib/env';
import { requireAuth, type AuthVariables } from './lib/middleware';
import items from './routes/items';
import type { User } from 'shared';

type Env = { Bindings: AppEnv; Variables: AuthVariables };

/**
 * The JSON API, mounted at /api. Chain each route, so that `ApiType` keeps its type.
 * The client reads `ApiType` through Hono RPC (`hono/client`).
 */
export const api = new Hono<Env>().route('/items', items).get('/protected', requireAuth, (c) =>
  c.json({
    message: 'Auth successful!',
    user: c.get('session').user as User,
    timestamp: new Date().toISOString(),
  }),
);

export type ApiType = typeof api;
