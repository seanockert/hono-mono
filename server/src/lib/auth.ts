import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { createDb } from './db';
import { sendEmail } from './email';
import type { AppEnv } from './env';

// PBKDF2, not the Better Auth default scrypt. scrypt exceeds the Workers CPU limit
// and sign-up fails with a 503.
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
  // Compare all bytes. An early exit leaks timing. `?? 0` is for the type checker only.
  for (let i = 0; i < derived.length; i++) diff |= (derived[i] ?? 0) ^ (expected[i] ?? 0);
  return diff === 0;
}

export const authConfig = {
  emailAndPassword: { enabled: true, password: { hash: hashPassword, verify: verifyPassword } },
  plugins: [admin(), bearer()],
  // Database, not memory, because each Workers isolate has its own memory.
  rateLimit: {
    enabled: true,
    storage: 'database' as const,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 300, max: 5 },
      // Not "/forget-password". That endpoint does not exist in 1.7.
      '/request-password-reset': { window: 300, max: 3 },
    },
  },
  // Removes one D1 query from each getSession. If the cookie is blocked, reads the database.
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
    // Not in authConfig, because it needs `env`. auth.cli.ts imports authConfig,
    // so authConfig must stay a plain const.
    emailAndPassword: {
      ...authConfig.emailAndPassword,
      sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) =>
        sendEmail(env, {
          to: user.email,
          subject: 'Reset your password',
          text: `Open this link to choose a new password:\n\n${url}\n\nThe link expires in one hour. If you did not ask for a reset, ignore this email.`,
        }),
    },
    // Not used until you set emailAndPassword.requireEmailVerification.
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

  return betterAuth({
    ...baseConfig,
    database: { db: createDb(env), type: 'sqlite' },
    advanced: env.DATABASE
      ? {
          defaultCookieAttributes: { sameSite: 'none', secure: true, httpOnly: true },
          // Cloudflare sets this header, so it is safe to trust. Without it, all callers
          // share one rate limit bucket and one attacker can lock out all users.
          // Not set on the Bun path, because there a client can forge the header.
          ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
        }
      : undefined,
  });
};

// One instance for each isolate. betterAuth() starts the D1 connection and all plugins again.
// Type from createAuthInstance, not betterAuth, because Auth<O> is invariant in O.
let _auth: ReturnType<typeof createAuthInstance> | null = null;
let _authKey: string | null = null;

export const createAuth = (env: AppEnv) => {
  const envKey = `${env.BETTER_AUTH_URL}:${env.BETTER_AUTH_SECRET}`;
  if (_auth && _authKey === envKey) return _auth;

  _auth = createAuthInstance(env);
  _authKey = envKey;
  return _auth;
};
