import { createMiddleware } from 'hono/factory';
import { createAuth } from './auth';
import { getEnv, type AppEnv } from './env';

export type AuthVariables = {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      role?: string | null;
    };
    session: {
      id: string;
      expiresAt: Date;
    };
  };
};

export const requireAuth = createMiddleware<{ Bindings: AppEnv; Variables: AuthVariables }>(
  async (c, next) => {
    const auth = createAuth(getEnv(c.env));
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json({ error: 'Unauthorised' }, 401);
    }

    c.set('session', session as AuthVariables['session']);
    await next();
  },
);
