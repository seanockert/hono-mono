import { betterAuth } from 'better-auth';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { CloudflareBindings } from '../index';
import { authConfig } from '../../better-auth.config';

const createAuth = (env?: CloudflareBindings) => {
  const isCloudflare = !!env?.DATABASE;

  // Running on Cloudflare Workers
  if (isCloudflare) {
    if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL || !env.CLIENT_URL) {
      throw new Error('Missing required environment variables');
    }

    const db = new Kysely({
      dialect: new D1Dialect({
        database: env.DATABASE!,
      }),
    });

    const socialProviders: any = {};
    if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
      socialProviders.github = {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      };
    }

    return betterAuth({
      ...authConfig,
      socialProviders,
      database: {
        db,
        type: 'sqlite',
      },
      baseURL: env.BETTER_AUTH_URL,
      secret: env.BETTER_AUTH_SECRET,
      trustedOrigins: [env.BETTER_AUTH_URL, env.CLIENT_URL],
      advanced: {
        defaultCookieAttributes: {
          sameSite: 'none',
          secure: true,
        },
      },
    });
  }

  // Local development with Bun SQLite
  const { Database } = require('bun:sqlite');
  const sqlite = new Database('src/auth.db');

  return betterAuth({
    ...authConfig,
    database: sqlite,
    baseURL: process.env.BETTER_AUTH_URL as string,
    secret: process.env.BETTER_AUTH_SECRET as string,
    trustedOrigins: [process.env.BETTER_AUTH_URL as string, process.env.CLIENT_URL as string],
  });
};

export { createAuth };
