#!/usr/bin/env bun
/**
 * Promotes a user to admin, or back down to user.
 *
 * Better Auth declares `role` with `input: false` and admin.setRole needs an
 * existing admin, so this script makes the first one.
 *
 * Usage:
 *   bun run admin <email>            Local database
 *   bun run admin <email> --remote   Production D1
 *   bun run admin <email> --revoke   Back down to "user"
 */

import { Database } from 'bun:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './lib';

const args = process.argv.slice(2);
const remote = args.includes('--remote');
const revoke = args.includes('--revoke');
const email = args.find((arg) => !arg.startsWith('--'));

const fail = (message: string): never => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};

if (!email) {
  console.error('\n  Usage: bun run admin <email> [--remote] [--revoke]\n');
  process.exit(1);
}

const role = revoke ? 'user' : 'admin';

/** readRole: `undefined` for no such user, `null` for a user with no role. */
type Driver = {
  readRole: () => string | null | undefined;
  writeRole: (role: string) => void;
};

// ─── Local: bun:sqlite ───────────────────────────────────────────────────────

const localDriver = (): Driver => {
  const file = join(root, 'server/src/honomono.db');
  if (!existsSync(file)) fail('No local database found. Run "bun run setup" first.');

  const db = new Database(file);

  return {
    readRole: () =>
      (
        db.prepare('SELECT role FROM "user" WHERE email = ?').get(email) as {
          role: string | null;
        } | null
      )?.role,
    writeRole: (next) => db.run('UPDATE "user" SET role = ? WHERE email = ?', [next, email]),
  };
};

// ─── Remote: wrangler d1 execute ─────────────────────────────────────────────

/** Not a security boundary. An address can legitimately contain a quote. */
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const remoteDriver = (): Driver => {
  const tomlPath = join(root, 'server/wrangler.toml');
  if (!existsSync(tomlPath)) fail('No server/wrangler.toml. Run "bun run deploy:setup" first.');

  const name = readFileSync(tomlPath, 'utf-8').match(/^\s*database_name\s*=\s*"([^"]+)"/m)?.[1];
  if (!name) fail('Could not read database_name from server/wrangler.toml.');

  const execute = (sql: string): Record<string, unknown>[] => {
    const result = Bun.spawnSync(
      ['bunx', 'wrangler', 'd1', 'execute', name, '--remote', '--json', '--command', sql],
      { cwd: join(root, 'server'), stdout: 'pipe', stderr: 'pipe' },
    );

    if (result.exitCode !== 0) fail(`wrangler failed:\n\n${result.stderr.toString().trim()}`);

    // wrangler prints progress lines before the JSON payload.
    const output = result.stdout.toString();
    const start = output.indexOf('[');
    if (start === -1) fail(`Could not parse wrangler output:\n\n${output.trim()}`);

    try {
      return JSON.parse(output.slice(start))[0]?.results ?? [];
    } catch {
      return fail(`Could not parse wrangler output:\n\n${output.trim()}`);
    }
  };

  return {
    readRole: () => {
      const rows = execute(`SELECT role FROM "user" WHERE email = ${quote(email)}`);
      return rows.length === 0 ? undefined : ((rows[0]?.role ?? null) as string | null);
    },
    writeRole: (next) => {
      execute(`UPDATE "user" SET role = ${quote(next)} WHERE email = ${quote(email)}`);
    },
  };
};

// ─── Run ─────────────────────────────────────────────────────────────────────

const target = remote ? 'production D1' : 'the local database';
const driver = remote ? remoteDriver() : localDriver();

const current = driver.readRole();

if (current === undefined) fail(`No user with email "${email}" in ${target}.`);

if (current === role) {
  console.log(`\n  ${email} is already ${role === 'admin' ? 'an admin' : 'a regular user'}.\n`);
  process.exit(0);
}

driver.writeRole(role);

console.log(
  `\n  ${email} is now ${role === 'admin' ? 'an admin' : 'a regular user'} in ${target}.`,
);
console.log('  Sign out and back in to refresh the session.\n');
