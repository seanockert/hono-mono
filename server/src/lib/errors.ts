import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Throw to choose the status. Anything else reaching `onError` becomes a 500. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const fail = (c: Context, status: ContentfulStatusCode, error: string) =>
  c.json({ error }, status);
