#!/usr/bin/env bun
/**
 * Cloudflare deployment setup — creates D1 database, generates wrangler.toml,
 * sets secrets, and runs remote migrations.
 *
 * Usage: bun run deploy:setup <appName>
 * Example: bun run deploy:setup hono-mono
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');

console.log('\n  Cloudflare deployment setup\n');

const appName = process.argv[2] || prompt('  App name (e.g. hono-mono): ')?.trim();

if (!appName) {
  console.error('  ✗ App name is required\n');
  process.exit(1);
}

const dbName = appName;

console.log(`\n  Setting up "${appName}"...\n`);

// ─── 1. Check wrangler auth ─────────────────────────────────────────────────

const whoami = Bun.spawnSync(['bunx', 'wrangler', 'whoami'], {
  stdout: 'pipe',
  stderr: 'pipe',
});

if (whoami.exitCode !== 0 || whoami.stdout.toString().includes('not authenticated')) {
  console.error('  ✗ Not logged in to Cloudflare. Run: bunx wrangler login\n');
  process.exit(1);
}

console.log('  ✓ Wrangler authenticated');

// ─── 2. Create or find D1 database ──────────────────────────────────────────

let databaseId = '';

// Check if database already exists
const listResult = Bun.spawnSync(['bunx', 'wrangler', 'd1', 'list', '--json'], {
  stdout: 'pipe',
  stderr: 'pipe',
});

if (listResult.exitCode === 0) {
  try {
    const databases = JSON.parse(listResult.stdout.toString());
    const existing = databases.find((db: { name: string }) => db.name === dbName);
    if (existing) {
      databaseId = existing.uuid;
      console.log(`  ✓ D1 database "${dbName}" already exists (${databaseId})`);
    }
  } catch {
    // Parse failed, will try to create
  }
}

if (!databaseId) {
  console.log(`  Creating D1 database "${dbName}"...`);
  const createResult = Bun.spawnSync(['bunx', 'wrangler', 'd1', 'create', dbName], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (createResult.exitCode !== 0) {
    console.error(`  ✗ Failed to create D1 database:\n${createResult.stderr.toString()}`);
    process.exit(1);
  }

  const output = createResult.stdout.toString();
  const match = output.match(/"database_id":\s*"([^"]+)"/) || output.match(/database_id\s*=\s*"([^"]+)"/);
  if (!match) {
    console.error(`  ✗ Could not parse database_id from wrangler output:\n${output}`);
    process.exit(1);
  }

  databaseId = match[1];
  console.log(`  ✓ D1 database created (${databaseId})`);
}

// ─── 3. Detect workers.dev subdomain ────────────────────────────────────────

let detectedWorkerUrl = '';

const subdomainResult = Bun.spawnSync(['bunx', 'wrangler', 'workers', 'subdomain', 'get'], {
  stdout: 'pipe',
  stderr: 'pipe',
});

if (subdomainResult.exitCode === 0) {
  const out = subdomainResult.stdout.toString();
  const match = out.match(/([a-z0-9-]+)\.workers\.dev/) || out.match(/^([a-z0-9-]+)\s*$/m);
  if (match) detectedWorkerUrl = `https://${appName}.${match[1]}.workers.dev`;
}

// ─── 4. Prompt for server and client URLs ───────────────────────────────────

console.log('');

const serverPrompt = detectedWorkerUrl
  ? `  Server URL [${detectedWorkerUrl}]: `
  : '  Server URL (e.g. https://hono-mono.yourname.workers.dev or https://api.yourapp.com): ';

const serverUrlInput = prompt(serverPrompt)?.trim();
const workerUrl = serverUrlInput || detectedWorkerUrl;

if (!workerUrl) {
  console.error('\n  ✗ Server URL is required\n');
  process.exit(1);
}

const clientPagesUrl = `https://${appName}-client.pages.dev`;
const customClientInput = prompt(
  `  Custom client domain? (e.g. myapp.com, leave blank to use ${clientPagesUrl} only): `,
)?.trim();
const clientUrls = customClientInput
  ? `${clientPagesUrl},https://${customClientInput}`
  : clientPagesUrl;

console.log('');

// ─── 5. Generate server/wrangler.toml ────────────────────────────────────────

const wranglerExamplePath = join(root, 'server/wrangler.toml.example');
const wranglerPath = join(root, 'server/wrangler.toml');

if (existsSync(wranglerPath)) {
  console.log('  ✓ server/wrangler.toml already exists — skipping');
} else {
  let toml = readFileSync(wranglerExamplePath, 'utf-8');
  toml = toml.replace(/name = ".*?"/, `name = "${appName}"`);
  toml = toml.replace(/database_id = ".*?"/, `database_id = "${databaseId}"`);
  toml = toml.replace(/database_name = ".*?"/, `database_name = "${dbName}"`);
  toml = toml.replace(/BETTER_AUTH_URL = ".*?"/, `BETTER_AUTH_URL = "${workerUrl}"`);
  toml = toml.replace(/CLIENT_URLS = ".*?"/, `CLIENT_URLS = "${clientUrls}"`);
  writeFileSync(wranglerPath, toml, 'utf-8');
  console.log('  ✓ server/wrangler.toml generated');
}

// ─── 6. Set BETTER_AUTH_SECRET ──────────────────────────────────────────────

const serverEnvPath = join(root, 'server/.env');
let secret = '';

if (existsSync(serverEnvPath)) {
  const envContent = readFileSync(serverEnvPath, 'utf-8');
  const secretMatch = envContent.match(/BETTER_AUTH_SECRET=(.+)/);
  if (secretMatch) secret = secretMatch[1].trim();
}

if (secret) {
  console.log('  Setting BETTER_AUTH_SECRET...');
  const secretResult = Bun.spawnSync(
    ['bunx', 'wrangler', 'secret', 'put', 'BETTER_AUTH_SECRET'],
    {
      cwd: join(root, 'server'),
      stdin: Buffer.from(secret),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );

  if (secretResult.exitCode === 0) {
    console.log('  ✓ BETTER_AUTH_SECRET set');
  } else {
    console.warn(`  ⚠ Failed to set secret: ${secretResult.stderr.toString()}`);
    console.warn('    Set it manually: echo "your-secret" | bunx wrangler secret put BETTER_AUTH_SECRET');
  }
} else {
  console.warn('  ⚠ No BETTER_AUTH_SECRET found in server/.env — set it manually:');
  console.warn('    echo "your-secret" | bunx wrangler secret put BETTER_AUTH_SECRET');
}

// ─── 7. Run remote migrations ───────────────────────────────────────────────

console.log('  Running remote migrations...');
const migrateResult = Bun.spawnSync(
  ['bunx', 'wrangler', 'd1', 'migrations', 'apply', dbName, '--remote'],
  {
    cwd: join(root, 'server'),
    stdout: 'inherit',
    stderr: 'inherit',
  },
);

if (migrateResult.exitCode !== 0) {
  console.warn('  ⚠ Remote migrations failed — you may need to run them manually:');
  console.warn(`    cd server && bunx wrangler d1 migrations apply ${dbName} --remote`);
}

// ─── 8. Generate client/.env.production ─────────────────────────────────────

const clientEnvProdPath = join(root, 'client/.env.production');
if (existsSync(clientEnvProdPath)) {
  console.log('  ✓ client/.env.production already exists — skipping');
} else {
  writeFileSync(clientEnvProdPath, `VITE_SERVER_URL=${workerUrl}\n`, 'utf-8');
  console.log('  ✓ client/.env.production generated');
}

// ─── Done ────────────────────────────────────────────────────────────────────

console.log(`
  Deploy setup complete!

  Next steps:
    cd server && bun run deploy     Deploy API to Cloudflare Workers
    cd client && bun run deploy     Deploy frontend to Cloudflare Pages

  Or deploy everything:
    bun run deploy
`);
