import { createMiddleware } from 'hono/factory';
import { createAuth } from './auth';
import { getEnv, type AppEnv } from './env';

export type Session = ReturnType<typeof createAuth>['$Infer']['Session'];

export type AuthVariables = { session: Session };

export const requireAuth = createMiddleware<{ Bindings: AppEnv; Variables: AuthVariables }>(
  async (c, next) => {
    const auth = createAuth(getEnv(c.env));
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json({ error: 'Unauthorised' }, 401);
    }

    c.set('session', session);
    await next();
  },
);
