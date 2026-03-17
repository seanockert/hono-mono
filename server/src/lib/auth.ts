import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { AppEnv } from '../index';

export const authConfig = {
  emailAndPassword: { enabled: true },
  plugins: [admin(), bearer()],
  user: {
    additionalFields: {
      role: {
        type: 'string' as const,
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },
};

export const parseUrlList = (urls?: string): string[] =>
  urls ? urls.split(',').map((u) => u.trim()).filter(Boolean) : [];

export const createAuth = (env: AppEnv) => {
  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL) {
    throw new Error('Missing required environment variables: BETTER_AUTH_URL and BETTER_AUTH_SECRET');
  }

  const trustedOrigins = [env.BETTER_AUTH_URL, ...parseUrlList(env.CLIENT_URLS)];

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  // Cloudflare D1
  if (env.DATABASE) {
    const db = new Kysely({
      dialect: new D1Dialect({
        database: env.DATABASE as import('@cloudflare/workers-types').D1Database,
      }),
    });

    return betterAuth({
      ...authConfig,
      socialProviders,
      database: { db, type: 'sqlite' },
      baseURL: env.BETTER_AUTH_URL,
      secret: env.BETTER_AUTH_SECRET,
      trustedOrigins,
      advanced: {
        defaultCookieAttributes: {
          sameSite: 'none',
          secure: true,
        },
      },
    });
  }

  // Bun SQLite (local dev or Bun deployment)
  const { Database } = require('bun:sqlite');
  const sqlite = new Database('src/auth.db');

  return betterAuth({
    ...authConfig,
    socialProviders,
    database: sqlite,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins,
  });
};
