#!/usr/bin/env bun
/**
 * Model scaffolder: generates the CRUD boilerplate for a new model.
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
  buildShared,
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

// A model keeps its original migration, so --force never adds a duplicate.
const existingMigration = readdirSync(join(root, 'server/migrations')).find((file) =>
  file.endsWith(`_create_${models}.sql`),
);

const targets: [template: string, path: string][] = [
  ['route.ts', `server/src/routes/${models}.ts`],
  ['types.ts', `shared/src/types/${model}.ts`],
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

/**
 * Inserts `addition` into a file at `anchor`. Fails loudly rather than leaving
 * a half-wired model behind, and does nothing if `marker` is already present.
 */
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
  'server/src/index.ts',
  `from './routes/${models}'`,
  "import type { User } from 'shared';",
  `import ${models} from './routes/${models}';\nimport type { User } from 'shared';`,
  `${models} import`,
);

patch(
  'server/src/index.ts',
  `app.route('/api/${models}'`,
  'export default app;',
  `app.route('/api/${models}', ${models});\n\nexport default app;`,
  `mounted /api/${models}`,
);

// Appended, not anchored: setup.ts may have renamed the default model's file.
const barrel = join(root, 'shared/src/types/index.ts');
const barrelSource = readFileSync(barrel, 'utf-8');
const reExport = `export * from './${model}';`;

if (barrelSource.includes(reExport)) {
  console.log(`  Skipped: shared/src/types/index.ts - ${Model} re-export already present`);
} else {
  writeFileSync(barrel, `${barrelSource.trimEnd()}\n${reExport}\n`, 'utf-8');
  touched.add('shared/src/types/index.ts');
  console.log(`  Patched: shared/src/types/index.ts - ${Model} re-export`);
}

patch(
  'client/src/router.ts',
  `./pages/${Models}.vue`,
  "import NotFound from './pages/NotFound.vue';",
  `import ${Models} from './pages/${Models}.vue';\nimport ${Model} from './pages/${Model}.vue';\nimport NotFound from './pages/NotFound.vue';`,
  'page imports',
);

patch(
  'client/src/router.ts',
  `name: '${models}'`,
  "  { name: 'not-found'",
  `  { name: '${models}', path: '/${models}', component: ${Models} },\n` +
    `  { name: '${model}', path: '/${model}/:slug', component: ${Model} },\n` +
    `  { name: 'not-found'`,
  'page routes',
);

formatFiles([...touched]);
buildShared();
runMigrate();

console.log(`
  Done! ${Model} model is ready at /api/${models}

  Add custom routes in server/src/routes/${models}.ts before the CRUD ones,
  or GET /:idOrSlug will shadow them.
`);
