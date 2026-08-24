#!/usr/bin/env bun
/**
 * One-command setup script. Idempotent, safe to re-run.
 *
 * Usage: bun run setup [modelName] [pluralName]
 *
 * Examples:
 *   bun run setup                       Prompts for model name (default: "item")
 *   bun run setup post                  Renames "item" -> "post", plural "posts"
 *   bun run setup category categories   Renames "item" -> "category"/"categories"
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShared, formatFiles, resolveModel, root, runMigrate } from './lib';

console.log('\n  Setting up hono-mono...\n');

const ask = (question: string) => (process.stdin.isTTY ? (prompt(question) ?? '').trim() : '');

// ─── 1. server/.env ──────────────────────────────────────────────────────────

const serverEnvPath = join(root, 'server/.env');

if (existsSync(serverEnvPath)) {
  console.log('  ✓ server/.env already exists - skipping');
} else {
  const example = readFileSync(join(root, 'server/.env.example'), 'utf-8');
  const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  writeFileSync(
    serverEnvPath,
    example.replace('your-super-secret-key-min-32-chars-long', secret),
    'utf-8',
  );
  console.log('  ✓ server/.env created');
}

// ─── 2. client/.env.local ────────────────────────────────────────────────────

const clientEnvPath = join(root, 'client/.env.local');

if (existsSync(clientEnvPath)) {
  console.log('  ✓ client/.env.local already exists - skipping');
} else {
  writeFileSync(clientEnvPath, 'VITE_SERVER_URL=http://localhost:3000\n', 'utf-8');
  console.log('  ✓ client/.env.local created');
}

// ─── 3. Rename the default model (optional) ──────────────────────────────────

const modelArg = process.argv[2] ?? ask('  Default model name (press Enter to keep "item"): ');
const itemRoutePath = join(root, 'server/src/routes/items.ts');

if (modelArg && modelArg.toLowerCase() !== 'item') {
  if (!existsSync(itemRoutePath)) {
    console.log('  ✓ Model already renamed - skipping');
  } else {
    const { defaultPlural } = resolveModel(modelArg);
    const pluralArg =
      process.argv[3] ?? ask(`  Plural form (press Enter to use "${defaultPlural}"): `);
    const { model, Model, models, Models } = resolveModel(modelArg, pluralArg || undefined);

    console.log(`\n  Renaming "item" -> "${model}"...\n`);

    // `Item` is replaced inside compound identifiers too (ItemTable, fetchItems),
    // so the DOM Storage methods are held aside first.
    const HELD = '__STORAGE_ITEM__';
    const replaceContent = (content: string) =>
      content
        .replace(/\.(get|set|remove)Item\b/g, `.$1${HELD}`)
        .replaceAll('Items', Models)
        .replaceAll('Item', Model)
        .replace(/(?<![A-Za-z0-9])items(?![A-Za-z0-9])/g, models)
        .replace(/(?<![A-Za-z0-9])item(?![A-Za-z0-9])/g, model)
        .replaceAll(HELD, 'Item');

    /** Rewrites a file, optionally renaming it. Returns the path written. */
    const transform = (from: string, to = from) => {
      const source = join(root, from);
      if (!existsSync(source)) return null;

      const target = join(root, to);
      const content = replaceContent(readFileSync(source, 'utf-8'));
      if (source !== target) unlinkSync(source);
      writeFileSync(target, content, 'utf-8');
      console.log(`    ${to}`);
      return target;
    };

    const written = [
      // The schema is one file, so it is rewritten in place, not renamed.
      transform('server/migrations/0000_initial.sql'),
      transform('server/src/routes/items.ts', `server/src/routes/${models}.ts`),
      transform('server/src/lib/db.ts'),
      transform('server/src/index.ts'),
      transform('shared/src/types/item.ts', `shared/src/types/${model}.ts`),
      transform('shared/src/types/index.ts'),
      transform('client/src/composables/useItems.ts', `client/src/composables/use${Models}.ts`),
      transform('client/src/pages/Items.vue', `client/src/pages/${Models}.vue`),
      transform('client/src/pages/Item.vue', `client/src/pages/${Model}.vue`),
      transform('client/src/router.ts'),
      transform('client/src/pages/Dashboard.vue'),
    ].filter((path) => path !== null);

    formatFiles(written);

    const missed = written.filter((path) => /item/i.test(readFileSync(path, 'utf-8')));
    if (missed.length > 0) {
      console.warn('\n  ⚠ "item" still appears in these files - check them by hand:');
      for (const path of missed) console.warn(`    ${path.replace(`${root}/`, '')}`);
    }

    console.log('');
  }
}

// ─── 4. Build and migrate ────────────────────────────────────────────────────

buildShared();
runMigrate();

console.log(`
  Setup complete!

  Next steps:
    bun run dev          Start all services
    open http://localhost:5173
`);
