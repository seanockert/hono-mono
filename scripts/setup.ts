#!/usr/bin/env bun
/**
 * One-command setup script — idempotent, safe to re-run.
 *
 * Usage: bun run setup [modelName]
 *
 * Examples:
 *   bun run setup          Prompts for model name (default: "item")
 *   bun run setup post     Renames "item" to "post" everywhere (non-interactive)
 */

import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
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

// ─── 3. Rename default model (optional) ──────────────────────────────────────

const rawArg = process.argv[2];
const modelArg = rawArg ?? (prompt('  Default model name (press Enter to keep "item"): ') ?? '').trim();

if (modelArg && modelArg.toLowerCase() !== 'item') {
  const model = modelArg.toLowerCase();
  const Model = model.charAt(0).toUpperCase() + model.slice(1);
  const models = `${model}s`;
  const Models = `${Model}s`;

  // Guard: only rename if the original item files still exist
  const itemRoutePath = join(root, 'server/src/routes/items.ts');
  if (!existsSync(itemRoutePath)) {
    console.log('  ✓ Model already renamed — skipping');
  } else {
    console.log(`  Renaming "item" → "${model}"...\n`);

    /** Replace all item/Item/items/Items variants in file content */
    const replaceContent = (content: string): string => {
      return content
        .replace(/\bItems\b/g, Models)
        .replace(/\bItem\b/g, Model)
        .replace(/\bitems\b/g, models)
        .replace(/\bitem\b/g, model);
    };

    /** Read, transform, and write a file in place */
    const transformFile = (filePath: string) => {
      const content = readFileSync(filePath, 'utf-8');
      writeFileSync(filePath, replaceContent(content), 'utf-8');
    };

    /** Read, transform, rename a file */
    const transformAndRename = (oldPath: string, newPath: string) => {
      const content = readFileSync(oldPath, 'utf-8');
      writeFileSync(newPath, replaceContent(content), 'utf-8');
      if (oldPath !== newPath) {
        unlinkSync(oldPath);
      }
    };

    // Migration SQL
    const migrationPath = join(root, 'server/migrations/0001_create_items.sql');
    if (existsSync(migrationPath)) {
      transformAndRename(
        migrationPath,
        join(root, `server/migrations/0001_create_${models}.sql`),
      );
      console.log(`    server/migrations/0001_create_${models}.sql`);
    }

    // Server route
    transformAndRename(
      itemRoutePath,
      join(root, `server/src/routes/${models}.ts`),
    );
    console.log(`    server/src/routes/${models}.ts`);

    // Server db.ts
    transformFile(join(root, 'server/src/lib/db.ts'));
    console.log('    server/src/lib/db.ts');

    // Server index.ts
    transformFile(join(root, 'server/src/index.ts'));
    console.log('    server/src/index.ts');

    // Shared types
    transformFile(join(root, 'shared/src/types/index.ts'));
    console.log('    shared/src/types/index.ts');

    // Client composable
    const composableSrc = join(root, 'client/src/composables/useItems.ts');
    if (existsSync(composableSrc)) {
      transformAndRename(
        composableSrc,
        join(root, `client/src/composables/use${Models}.ts`),
      );
      console.log(`    client/src/composables/use${Models}.ts`);
    }

    // Client list page
    const listPageSrc = join(root, 'client/src/pages/Items.vue');
    if (existsSync(listPageSrc)) {
      transformAndRename(
        listPageSrc,
        join(root, `client/src/pages/${Models}.vue`),
      );
      console.log(`    client/src/pages/${Models}.vue`);
    }

    // Client detail page
    const detailPageSrc = join(root, 'client/src/pages/Item.vue');
    if (existsSync(detailPageSrc)) {
      transformAndRename(
        detailPageSrc,
        join(root, `client/src/pages/${Model}.vue`),
      );
      console.log(`    client/src/pages/${Model}.vue`);
    }

    // Client router
    transformFile(join(root, 'client/src/router.ts'));
    console.log('    client/src/router.ts');

    console.log('');
  }
}

// ─── 4. Migrations ───────────────────────────────────────────────────────────

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
