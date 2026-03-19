import { betterAuth } from 'better-auth';
import { authConfig } from './auth';

// Entry point for Better Auth CLI migrations:
//   bunx --bun @better-auth/cli generate --config src/lib/auth.cli.ts
const { Database } = require('bun:sqlite');

export const auth = betterAuth({
  ...authConfig,
  database: new Database('src/honomono.db'),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret',
});
