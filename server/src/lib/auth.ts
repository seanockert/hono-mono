import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { AppEnv } from '../index';

// PBKDF2 via Web Crypto API — works in Cloudflare Workers and Bun.
// bcrypt/scrypt exceed Workers' CPU time limit causing 503 on sign-up.
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `pbkdf2:sha256:100000:${saltB64}:${hashB64}`;
}

async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const parts = hash.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const [, , iterStr, saltB64, hashB64] = parts;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: parseInt(iterStr), hash: 'SHA-256' },
    key,
    256,
  );
  const derived = new Uint8Array(bits);
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}

export const authConfig = {
  emailAndPassword: { enabled: true, password: { hash: hashPassword, verify: verifyPassword } },
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
  const sqlite = new Database('src/honomono.db');

  return betterAuth({
    ...authConfig,
    socialProviders,
    database: sqlite,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins,
  });
};
