-- better-auth 1.7 needs "issuer" on the account table to tell local accounts from OAuth.
-- Without it, sign-up fails: "table account has no column named issuer".
alter table "account" add column "issuer" text;
