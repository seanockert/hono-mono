#!/usr/bin/env bun
/**
 * Generates the CRUD files for a new model.
 *
 * Usage:
 *   bun run generate <modelName> [pluralName] [--force]
 *
 * Example:
 *   bun run generate post
 *   bun run generate category categories
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  formatFiles,
  nextMigrationNumber,
  resolveModel,
  root,
  runMigrate,
  type ModelNames,
} from './lib';

const args = process.argv.slice(2);
const force = args.includes('--force');
const [modelArg, pluralArg] = args.filter((a) => !a.startsWith('--'));

if (!modelArg) {
  console.error('Usage: bun run generate <modelName> [pluralName] [--force]');
  console.error('Example: bun run generate category categories');
  process.exit(1);
}

const names = resolveModel(modelArg, pluralArg);
const { model, Model, models, Models } = names;

const fill = (text: string, n: ModelNames) =>
  text
    .replaceAll('__Models__', n.Models)
    .replaceAll('__Model__', n.Model)
    .replaceAll('__models__', n.models)
    .replaceAll('__model__', n.model);

const template = (name: string) =>
  fill(readFileSync(join(import.meta.dir, 'templates', name), 'utf-8'), names);

const rel = (path: string) => path.replace(`${root}/`, '');

// Keep the first migration of a model, so that --force does not add a second one.
const existingMigration = readdirSync(join(root, 'server/migrations')).find((file) =>
  file.endsWith(`_create_${models}.sql`),
);

const targets: [template: string, path: string][] = [
  ['route.ts', `server/src/routes/${models}.ts`],
  ['composable.ts', `client/src/composables/use${Models}.ts`],
  ['list.vue', `client/src/pages/${Models}.vue`],
  ['detail.vue', `client/src/pages/${Model}.vue`],
];

if (!existingMigration) {
  const path = `server/migrations/${nextMigrationNumber()}_create_${models}.sql`;
  targets.unshift(['migration.sql', path]);
}

const clashes = targets.filter(([, path]) => existsSync(join(root, path)));
if (clashes.length > 0 && !force) {
  console.error(`\n  These files already exist:\n`);
  for (const [, path] of clashes) console.error(`    ${path}`);
  console.error(`\n  Re-run with --force to overwrite them.\n`);
  process.exit(1);
}

console.log(`\nScaffolding model: ${Model}\n`);

if (existingMigration) console.log(`  Kept:    server/migrations/${existingMigration}`);

for (const [name, path] of targets) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, template(name), 'utf-8');
  console.log(`  Created: ${path}`);
}

// Inserts `addition` at `anchor`. Skips if `marker` is present. Exits if `anchor`
// is missing, so that a model is never half connected.
const touched = new Set(targets.map(([, path]) => path));

const patch = (path: string, marker: string, anchor: string, addition: string, note: string) => {
  const full = join(root, path);
  const source = readFileSync(full, 'utf-8');

  if (source.includes(marker)) {
    console.log(`  Skipped: ${rel(full)} - ${note} already present`);
    return;
  }
  if (!source.includes(anchor)) {
    console.error(`\n  Could not patch ${path}: anchor "${anchor}" not found.`);
    console.error(`  Add this by hand:\n\n${addition}\n`);
    process.exit(1);
  }

  writeFileSync(full, source.replace(anchor, addition), 'utf-8');
  touched.add(path);
  console.log(`  Patched: ${path} - ${note}`);
};

patch(
  'server/src/lib/db.ts',
  `${Model}Table`,
  'export interface AppDatabase {',
  `export interface ${Model}Table extends CrudTable {}\n\nexport interface AppDatabase {`,
  `${Model}Table`,
);

patch(
  'server/src/lib/db.ts',
  `  ${model}: ${Model}Table;`,
  'export interface AppDatabase {',
  `export interface AppDatabase {\n  ${model}: ${Model}Table;`,
  `${model} in AppDatabase`,
);

patch(
  'server/src/lib/models.ts',
  `'${model}'`,
  'export const ADMIN_MODELS = [',
  `export const ADMIN_MODELS = ['${model}',`,
  `${model} in ADMIN_MODELS`,
);

patch(
  'server/src/api.ts',
  `from './routes/${models}'`,
  "import type { User } from 'shared';",
  `import ${models} from './routes/${models}';\nimport type { User } from 'shared';`,
  `${models} import`,
);

patch(
  'server/src/api.ts',
  `.route('/${models}'`,
  'export const api = new Hono<Env>()',
  `export const api = new Hono<Env>()\n  .route('/${models}', ${models})`,
  `mounted /api/${models}`,
);

patch(
  'client/src/router.ts',
  `name: '${models}'`,
  "  {\n    name: 'not-found',",
  `  { name: '${models}', path: '/${models}', component: () => import('./pages/${Models}.vue') },\n` +
    `  { name: '${model}', path: '/${model}/:slug', component: () => import('./pages/${Model}.vue') },\n` +
    `  {\n    name: 'not-found',`,
  'page routes',
);

formatFiles([...touched]);
runMigrate();

console.log(`
  Done! ${Model} model is ready at /api/${models}

  Add model columns in the migration, ${Model}Table in server/src/lib/db.ts,
  and the \`fields\` argument in server/src/routes/${models}.ts.

  Add custom routes in server/src/routes/${models}.ts before the CRUD ones,
  or GET /:idOrSlug will shadow them.
`);
