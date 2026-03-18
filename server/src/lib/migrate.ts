import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const db = new Database('src/auth.db');

db.run(`CREATE TABLE IF NOT EXISTS "_migrations" (
  "name"      TEXT NOT NULL PRIMARY KEY,
  "appliedAt" TEXT NOT NULL
)`);

const migrationsDir = join(import.meta.dir, '../../migrations');
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  const row = db.prepare('SELECT name FROM "_migrations" WHERE name = ?').get(file);
  if (row) {
    console.log(`Skipping ${file} (already applied)`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, file), 'utf-8');
  db.run(sql);
  db.run('INSERT INTO "_migrations" (name, appliedAt) VALUES (?, ?)', [
    file,
    new Date().toISOString(),
  ]);
  console.log(`Applied ${file}`);
}

console.log('Migrations complete.');
