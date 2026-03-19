import { Kysely, SqliteDialect } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { AppEnv } from './env';

export interface ItemTable {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: string;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppDatabase {
  item: ItemTable;
}

export const createDb = (env: AppEnv): Kysely<AppDatabase> => {
  if (env.DATABASE) {
    return new Kysely<AppDatabase>({
      dialect: new D1Dialect({
        database: env.DATABASE as import('@cloudflare/workers-types').D1Database,
      }),
    });
  }

  const { Database } = require('bun:sqlite');
  const sqlite = new Database('src/honomono.db');

  // Bun's Statement lacks the `reader` boolean Kysely's SqliteDialect needs to
  // distinguish SELECT from write statements. Patch it onto every prepared statement.
  const originalPrepare = sqlite.prepare.bind(sqlite);
  sqlite.prepare = (sql: string) => {
    const stmt = originalPrepare(sql);
    if (!('reader' in stmt)) {
      Object.defineProperty(stmt, 'reader', {
        value: /^\s*(SELECT|WITH|EXPLAIN|PRAGMA\s+\w+\s*(?!=))/i.test(sql),
        writable: false,
      });
    }
    return stmt;
  };

  return new Kysely<AppDatabase>({
    dialect: new SqliteDialect({ database: sqlite }),
  });
};
