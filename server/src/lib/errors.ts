import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// Generic, so that the RPC client sees the exact status, not every status.
export const fail = <S extends ContentfulStatusCode>(c: Context, status: S, error: string) =>
  c.json({ error }, status);

/** Gives the column, as "table.column", if `error` is a SQLite UNIQUE violation. */
export const uniqueViolation = (error: unknown) =>
  error instanceof Error
    ? error.message.match(/UNIQUE constraint failed: ([\w.]+)/)?.[1]
    : undefined;
