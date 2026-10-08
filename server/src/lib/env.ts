export type AppEnv = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CLIENT_URLS?: string;
  DATABASE?: unknown;
  EMAIL_FROM?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  /** Cloudflare rate limit binding. Not set on Bun. */
  WRITE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
};

const ENV_KEYS = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'CLIENT_URLS',
  'DATABASE',
  'EMAIL_FROM',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'RESEND_API_KEY',
];

/** Returns the Cloudflare bindings. If there are none (Bun), reads the known keys from process.env. */
export const getEnv = (bindings: AppEnv): AppEnv =>
  Object.fromEntries(
    Object.keys(bindings).length > 0
      ? Object.entries(bindings)
      : Object.entries(process.env).filter(([k]) => ENV_KEYS.includes(k)),
  );
