import { Kysely, SqliteDialect } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { AppEnv } from './env';

export interface CrudTable {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: string;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemTable extends CrudTable {}

export interface AppDatabase {
  item: ItemTable;
}

/** Resolved from this module, so the cwd does not matter. */
export const dbPath = () => decodeURIComponent(new URL('../honomono.db', import.meta.url).pathname);

// One instance per isolate, rebuilt only if the binding changes.
let cached: Kysely<AppDatabase> | null = null;
let cachedFor: unknown;

export const createDb = (env: AppEnv): Kysely<AppDatabase> => {
  if (cached && cachedFor === env.DATABASE) return cached;
  cachedFor = env.DATABASE;

  if (env.DATABASE) {
    cached = new Kysely<AppDatabase>({
      dialect: new D1Dialect({
        database: env.DATABASE as import('@cloudflare/workers-types').D1Database,
      }),
    });
    return cached;
  }

  const { Database } = require('bun:sqlite');
  const sqlite = new Database(dbPath());

  // Kysely's SqliteDialect needs a `reader` flag to tell reads from writes, and
  // Bun's Statement has none. RETURNING makes a write produce rows, so it reads too.
  const originalPrepare = sqlite.prepare.bind(sqlite);
  sqlite.prepare = (sql: string) => {
    const stmt = originalPrepare(sql);
    if (!('reader' in stmt)) {
      Object.defineProperty(stmt, 'reader', {
        value:
          /^\s*(SELECT|WITH|EXPLAIN|PRAGMA\s+\w+\s*(?!=))/i.test(sql) || /\bRETURNING\b/i.test(sql),
        writable: false,
      });
    }
    return stmt;
  };

  cached = new Kysely<AppDatabase>({ dialect: new SqliteDialect({ database: sqlite }) });
  return cached;
};
