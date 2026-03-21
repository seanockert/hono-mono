import { join } from 'node:path';

export const root = join(import.meta.dir, '..');

/**
 * Resolves model name variants from a raw input.
 * e.g. "category", "categories" → { model: "category", Model: "Category", models: "categories", Models: "Categories", defaultPlural: "categories" }
 */
export function resolveModel(name: string, plural?: string) {
  const model = name.toLowerCase();
  const Model = model.charAt(0).toUpperCase() + model.slice(1);
  const defaultPlural = model.endsWith('y') ? `${model.slice(0, -1)}ies` : `${model}s`;
  const models = (plural ?? '').toLowerCase() || defaultPlural;
  const Models = models.charAt(0).toUpperCase() + models.slice(1);
  return { model, Model, models, Models, defaultPlural };
}

/** Runs `bun run migrate` in server/, exits with error on failure. */
export function runMigrate() {
  console.log('  Running migration...');
  const result = Bun.spawnSync(['bun', 'run', 'migrate'], {
    cwd: join(root, 'server'),
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (result.exitCode !== 0) {
    console.error('\n  Migration failed. Check errors above.\n');
    process.exit(1);
  }
}
