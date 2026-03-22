import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { AppEnv } from '../index';

// better-auth's default (scrypt) exceeds Workers' CPU time limit causing 503 on sign-up.
// PBKDF2 via Web Crypto API works in both Cloudflare Workers and Bun.
const toB64 = (buf: Uint8Array) => btoa(Array.from(buf, (c) => String.fromCharCode(c)).join(''));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2Key(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Key(password, salt, 100000);
  return `pbkdf2:sha256:100000:${toB64(salt)}:${toB64(hash)}`;
}

async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const parts = hash.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const [, , iterStr, saltB64, hashB64] = parts;
  const expected = fromB64(hashB64);
  const derived = await pbkdf2Key(password, fromB64(saltB64), parseInt(iterStr));
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

// Cache auth instance per Worker isolate — re-creating betterAuth() per request is expensive
// (re-initialises Kysely/D1 connection and all plugins on every request).
let _auth: ReturnType<typeof betterAuth> | null = null;
let _authKey: string | null = null;

export const createAuth = (env: AppEnv) => {
  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL) {
    throw new Error('Missing required environment variables: BETTER_AUTH_URL and BETTER_AUTH_SECRET');
  }

  const envKey = `${env.BETTER_AUTH_URL}:${env.BETTER_AUTH_SECRET}`;
  if (_auth && _authKey === envKey) return _auth;

  const trustedOrigins = [env.BETTER_AUTH_URL, ...parseUrlList(env.CLIENT_URLS)];

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  const baseConfig = {
    ...authConfig,
    socialProviders,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins,
  };

  // Cloudflare D1
  if (env.DATABASE) {
    const db = new Kysely({
      dialect: new D1Dialect({
        database: env.DATABASE as import('@cloudflare/workers-types').D1Database,
      }),
    });

    _auth = betterAuth({
      ...baseConfig,
      database: { db, type: 'sqlite' },
      advanced: {
        defaultCookieAttributes: { sameSite: 'none', secure: true, httpOnly: true },
      },
    });
  } else {
    // Bun SQLite (local dev or Bun deployment)
    const { Database } = require('bun:sqlite');
    _auth = betterAuth({ ...baseConfig, database: new Database('src/honomono.db') });
  }

  _authKey = envKey;
  return _auth;
};
