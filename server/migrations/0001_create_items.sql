CREATE TABLE IF NOT EXISTS "item" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "title"     TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "content"   TEXT,
  "status"    TEXT NOT NULL DEFAULT 'draft',
  "authorId"  TEXT REFERENCES "user" ("id") ON DELETE SET NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "item_slug_idx"      ON "item" ("slug");
CREATE INDEX IF NOT EXISTS "item_status_idx"    ON "item" ("status");
CREATE INDEX IF NOT EXISTS "item_createdAt_idx" ON "item" ("createdAt");
