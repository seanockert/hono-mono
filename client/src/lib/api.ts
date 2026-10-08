import { DetailedError, hc } from 'hono/client';
// Type only. No server code goes into the client bundle.
import type { ApiType } from '../../../server/src/api';
import { SERVER_URL, authHeaders } from './config';

/** Typed client for the JSON API. Types come from the server routes through Hono RPC. */
export const api = hc<ApiType>(`${SERVER_URL}/api`, {
  init: { credentials: 'include' },
  headers: authHeaders,
});

/** Gives the `{ error }` text from a `parseResponse` error, or `fallback`. */
export const errorText = (err: unknown, fallback: string) => {
  if (err instanceof DetailedError) {
    const message = err.detail?.data?.error;
    return typeof message === 'string' ? message : err.message;
  }
  return err instanceof Error ? err.message : fallback;
};
