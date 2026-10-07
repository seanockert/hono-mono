import type { CrudTableName } from './crud';

/** Tables that the admin manages. `bun run generate` adds to this list. */
export const ADMIN_MODELS = ['item'] as const satisfies readonly CrudTableName[];

export const isAdminModel = (name: string): name is CrudTableName =>
  (ADMIN_MODELS as readonly string[]).includes(name);

/** "post" -> "Posts", "category" -> "Categories". */
export const modelLabel = (name: string) => {
  const plural = name.endsWith('y')
    ? `${name.slice(0, -1)}ies`
    : name.endsWith('s')
      ? `${name}es`
      : `${name}s`;
  return plural.charAt(0).toUpperCase() + plural.slice(1);
};
