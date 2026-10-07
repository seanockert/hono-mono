import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const fail = (c: Context, status: ContentfulStatusCode, error: string) =>
  c.json({ error }, status);

/** Gives the column, as "table.column", if `error` is a SQLite UNIQUE violation. */
export const uniqueViolation = (error: unknown) =>
  error instanceof Error
    ? error.message.match(/UNIQUE constraint failed: ([\w.]+)/)?.[1]
    : undefined;
