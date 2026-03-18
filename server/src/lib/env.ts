export type AppEnv = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CLIENT_URLS?: string;
  DATABASE?: unknown;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

const ENV_KEYS = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'CLIENT_URLS',
  'DATABASE',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
];

/** Merge Cloudflare bindings (c.env) with process.env for Bun/Node */
export const getEnv = (bindings: AppEnv): AppEnv => ({
  ...Object.fromEntries(
    Object.keys(bindings).length > 0
      ? Object.entries(bindings)
      : Object.entries(process.env).filter(([k]) => ENV_KEYS.includes(k)),
  ),
});
