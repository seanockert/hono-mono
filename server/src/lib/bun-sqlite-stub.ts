// Stub for bun:sqlite — never called in Cloudflare Workers (D1 is used instead)
export class Database {
  constructor() {
    throw new Error('bun:sqlite is not available in Cloudflare Workers');
  }
}
