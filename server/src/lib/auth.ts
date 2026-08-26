import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { dbPath } from './db';
import { sendEmail } from './email';
import type { AppEnv } from './env';

// scrypt, better-auth's default, exceeds the Workers CPU limit and gives 503 on sign-up.
// PBKDF2 from Web Crypto works in Workers and Bun.
const toB64 = (buf: Uint8Array) => btoa(Array.from(buf, (c) => String.fromCharCode(c)).join(''));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2Key(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
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
  if (!iterStr || !saltB64 || !hashB64) return false;
  const expected = fromB64(hashB64);
  const derived = await pbkdf2Key(password, fromB64(saltB64), parseInt(iterStr));
  if (derived.length !== expected.length) return false;
  let diff = 0;
  // `?? 0` never runs: the lengths are equal. It satisfies noUncheckedIndexedAccess
  // without an early exit, which would leak timing.
  for (let i = 0; i < derived.length; i++) diff |= (derived[i] ?? 0) ^ (expected[i] ?? 0);
  return diff === 0;
}

export const authConfig = {
  emailAndPassword: { enabled: true, password: { hash: hashPassword, verify: verifyPassword } },
  plugins: [admin(), bearer()],
  // Database-backed: each Workers isolate has its own memory, so an in-memory
  // counter would barely hold. The cost is one D1 write per limited request.
  rateLimit: {
    enabled: true,
    storage: 'database' as const,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 300, max: 5 },
      // Not "/forget-password", which matches no endpoint in 1.7.
      '/request-password-reset': { window: 300, max: 3 },
    },
  },
  // Reads the session from a signed cookie instead of the database. Saves one D1
  // round trip on every getSession call. Falls back to the database when the cookie
  // is absent, which is the case in browsers that block third-party cookies.
  session: { cookieCache: { enabled: true, maxAge: 300 } },
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
  urls
    ? urls
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

const createAuthInstance = (env: AppEnv) => {
  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL) {
    throw new Error(
      'Missing required environment variables: BETTER_AUTH_URL and BETTER_AUTH_SECRET',
    );
  }

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
    // Here rather than in authConfig because it needs `env`, and authConfig has
    // to stay a plain const for auth.cli.ts to import.
    emailAndPassword: {
      ...authConfig.emailAndPassword,
      sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) =>
        sendEmail(env, {
          to: user.email,
          subject: 'Reset your password',
          text: `Open this link to choose a new password:\n\n${url}\n\nThe link expires in one hour. If you did not ask for a reset, ignore this email.`,
        }),
    },
    // Unused until emailAndPassword.requireEmailVerification is set.
    emailVerification: {
      sendVerificationEmail: ({ user, url }: { user: { email: string }; url: string }) =>
        sendEmail(env, {
          to: user.email,
          subject: 'Verify your email address',
          text: `Open this link to verify your email address:\n\n${url}`,
        }),
    },
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

    return betterAuth({
      ...baseConfig,
      database: { db, type: 'sqlite' },
      advanced: {
        defaultCookieAttributes: { sameSite: 'none', secure: true, httpOnly: true },
        // Cloudflare overwrites this header, so it can be trusted. Without it
        // every caller shares one rate-limit bucket and a single attacker can
        // lock everybody out. Deliberately not set on the Bun path below, where
        // the header is forgeable.
        ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      },
    });
  }

  // Bun SQLite (local dev or Bun deployment)
  const { Database } = require('bun:sqlite');
  return betterAuth({ ...baseConfig, database: new Database(dbPath()) });
};

// One auth instance per Worker isolate. betterAuth() is expensive: it re-initialises
// the Kysely/D1 connection and all plugins.
// The type comes from createAuthInstance, not betterAuth: betterAuth is generic and
// Auth<O> is invariant in O, so the constraint instantiation is not assignable.
let _auth: ReturnType<typeof createAuthInstance> | null = null;
let _authKey: string | null = null;

export const createAuth = (env: AppEnv) => {
  const envKey = `${env.BETTER_AUTH_URL}:${env.BETTER_AUTH_SECRET}`;
  if (_auth && _authKey === envKey) return _auth;

  _auth = createAuthInstance(env);
  _authKey = envKey;
  return _auth;
};
