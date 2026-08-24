// Stub for bun:sqlite. Cloudflare Workers use D1 and never call it.
export class Database {
  constructor() {
    throw new Error('bun:sqlite is not available in Cloudflare Workers');
  }
}
