#!/usr/bin/env bun
/**
 * One-command setup script — idempotent, safe to re-run.
 *
 * Usage: bun run setup
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');

console.log('\n  Setting up hono-mono...\n');

// ─── 1. server/.env ──────────────────────────────────────────────────────────

const serverEnvPath = join(root, 'server/.env');

if (existsSync(serverEnvPath)) {
  console.log('  ✓ server/.env already exists — skipping');
} else {
  const example = readFileSync(join(root, 'server/.env.example'), 'utf-8');
  const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const env = example.replace('your-super-secret-key-min-32-chars-long', secret);
  writeFileSync(serverEnvPath, env, 'utf-8');
  console.log('  ✓ server/.env created');
}

// ─── 2. client/.env.local ────────────────────────────────────────────────────

const clientEnvPath = join(root, 'client/.env.local');

if (existsSync(clientEnvPath)) {
  console.log('  ✓ client/.env.local already exists — skipping');
} else {
  writeFileSync(clientEnvPath, 'VITE_SERVER_URL=http://localhost:3000\n', 'utf-8');
  console.log('  ✓ client/.env.local created');
}

// ─── 3. Migrations ───────────────────────────────────────────────────────────

console.log('  Running migrations...');
const result = Bun.spawnSync(['bun', 'run', 'migrate'], {
  cwd: join(root, 'server'),
  stdout: 'inherit',
  stderr: 'inherit',
});

if (result.exitCode !== 0) {
  console.error('\n  Migration failed. Check errors above.\n');
  process.exit(1);
}

// ─── Done ────────────────────────────────────────────────────────────────────

console.log(`
  Setup complete!

  Next steps:
    bun run dev          Start all services
    open http://localhost:5173
`);
