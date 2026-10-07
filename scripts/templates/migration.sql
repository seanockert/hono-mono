CREATE TABLE IF NOT EXISTS "__model__" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "title"     TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "content"   TEXT,
  "status"    TEXT NOT NULL DEFAULT 'draft',
  "authorId"  TEXT REFERENCES "user" ("id") ON DELETE SET NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "__model___status_idx"    ON "__model__" ("status");
CREATE INDEX IF NOT EXISTS "__model___createdAt_idx" ON "__model__" ("createdAt");
