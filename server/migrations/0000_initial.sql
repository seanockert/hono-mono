-- Full schema. Better Auth tables first, then the application tables.
-- Better Auth needs "issuer" on account from 1.7 on, to tell local accounts from OAuth.

CREATE TABLE IF NOT EXISTS "user" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image"         TEXT,
  "createdAt"     DATE NOT NULL,
  "updatedAt"     DATE NOT NULL,
  "role"          TEXT,
  "banned"        INTEGER,
  "banReason"     TEXT,
  "banExpires"    DATE
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "expiresAt"      DATE NOT NULL,
  "token"          TEXT NOT NULL UNIQUE,
  "createdAt"      DATE NOT NULL,
  "updatedAt"      DATE NOT NULL,
  "ipAddress"      TEXT,
  "userAgent"      TEXT,
  "userId"         TEXT NOT NULL REFERENCES "user" ("id"),
  "impersonatedBy" TEXT
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "user" ("id"),
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  DATE,
  "refreshTokenExpiresAt" DATE,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             DATE NOT NULL,
  "updatedAt"             DATE NOT NULL,
  "issuer"                TEXT
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  DATE NOT NULL,
  "createdAt"  DATE,
  "updatedAt"  DATE
);

-- Better Auth rate limiting with storage: 'database'.
CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "key"         TEXT NOT NULL UNIQUE,
  "count"       INTEGER NOT NULL,
  "lastRequest" INTEGER NOT NULL
);

-- Sign-in joins "account" on userId. Listing or revoking a user's sessions
-- filters "session" on userId. Neither is covered by a UNIQUE constraint.
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");

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
