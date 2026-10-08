import { Kysely, SqliteDialect } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Status } from 'shared';
import type { AppEnv } from './env';

export interface CrudTable {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: Status;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemTable extends CrudTable {}

export interface AppDatabase {
  item: ItemTable;
}

/** Relative to this module, not to the cwd. */
export const dbPath = () => decodeURIComponent(new URL('../honomono.db', import.meta.url).pathname);

// One instance for each isolate. Rebuilt only when the binding changes.
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
  // D1 enforces foreign keys. SQLite does not, unless this pragma is on.
  sqlite.run('PRAGMA foreign_keys = ON');

  // Kysely SqliteDialect uses a `reader` flag to find reads. Bun Statement has no
  // such flag, so add it. A write with RETURNING gives rows, so it is also a read.
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
