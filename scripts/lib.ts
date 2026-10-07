import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export const root = join(import.meta.dir, '..');

// Local names in the templates. A model with one of these names hides them.
const RESERVED = new Set([
  'const',
  'class',
  'content',
  'data',
  'db',
  'default',
  'delete',
  'error',
  'export',
  'function',
  'id',
  'import',
  'limit',
  'new',
  'page',
  'params',
  'query',
  'return',
  'route',
  'routes',
  'search',
  'session',
  'slug',
  'sortby',
  'sortorder',
  'status',
  'title',
  'total',
  'updates',
  'user',
  'var',
  'void',
]);

export type ModelNames = ReturnType<typeof resolveModel>;

/**
 * "category" -> { model: "category", Model: "Category", models: "categories",
 * Models: "Categories" }. Exits if the name cannot make a valid identifier.
 */
export function resolveModel(name: string, plural?: string) {
  const model = name.trim().toLowerCase();
  const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const fail = (reason: string) => {
    console.error(`\n  Invalid model name "${name}": ${reason}\n`);
    process.exit(1);
  };

  if (!/^[a-z][a-z0-9]*$/.test(model)) {
    fail('use letters and digits only, starting with a letter (e.g. "product")');
  }
  if (RESERVED.has(model)) fail('that name is reserved by the generated code');

  const defaultPlural = model.endsWith('y') ? `${model.slice(0, -1)}ies` : `${model}s`;
  const models = (plural ?? '').trim().toLowerCase() || defaultPlural;

  if (!/^[a-z][a-z0-9]*$/.test(models)) {
    fail(`plural "${models}" must be letters and digits only, starting with a letter`);
  }
  if (RESERVED.has(models)) fail(`plural "${models}" is reserved by the generated code`);
  if (models === model) {
    fail('the singular and plural must differ, or the generated files collide');
  }

  return { model, Model: capitalise(model), models, Models: capitalise(models), defaultPlural };
}

/** Zero-padded, as Wrangler numbers migrations. */
export function nextMigrationNumber(): string {
  const files = readdirSync(join(root, 'server/migrations')).filter((f) => f.endsWith('.sql'));
  const highest = files.reduce((max, file) => {
    const n = parseInt(file.split('_')[0] ?? '', 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, -1);
  return String(highest + 1).padStart(4, '0');
}

const run = (cmd: string[], cwd: string, label: string) => {
  const result = Bun.spawnSync(cmd, { cwd, stdout: 'inherit', stderr: 'inherit' });
  if (result.exitCode !== 0) {
    console.error(`\n  ${label} failed. Check errors above.\n`);
    process.exit(1);
  }
};

export function runMigrate() {
  console.log('  Running migration...');
  run(['bun', 'run', 'migrate'], join(root, 'server'), 'Migration');
}

export function buildShared() {
  console.log('  Rebuilding shared types...');
  run(['bun', 'run', 'build'], join(root, 'shared'), 'Shared build');
}

export function formatFiles(paths: string[]) {
  if (paths.length === 0) return;
  const result = Bun.spawnSync(['bunx', 'oxfmt', ...paths], {
    cwd: root,
    stdout: 'ignore',
    stderr: 'ignore',
  });
  if (result.exitCode !== 0)
    console.warn('  ⚠ Could not format the new files - run "bun run format"');
}
