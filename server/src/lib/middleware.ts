import { createMiddleware } from 'hono/factory';
import { createAuth } from './auth';
import { fail } from './errors';
import { getEnv, type AppEnv } from './env';

export type Session = ReturnType<typeof createAuth>['$Infer']['Session'];

export type AuthVariables = { session: Session };

type Env = { Bindings: AppEnv; Variables: AuthVariables };

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const auth = createAuth(getEnv(c.env));
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'Unauthorised' }, 401);
  }

  c.set('session', session);
  await next();
});

/**
 * Limits writes for each user with the `WRITE_LIMITER` binding. Use after `requireAuth`.
 * Without the binding (Bun), all writes continue.
 */
export const limitWrites = createMiddleware<Env>(async (c, next) => {
  const limiter = getEnv(c.env).WRITE_LIMITER;
  if (limiter) {
    const { success } = await limiter.limit({ key: c.get('session').user.id });
    if (!success) return fail(c, 429, 'Too many requests. Wait a moment and try again.');
  }
  await next();
});
