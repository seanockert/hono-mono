## Environment Variables

The server uses environment variables for configuration:

- `CLIENT_URL`: The frontend client URL (configured in wrangler.json for Cloudflare Workers)

**For local development:**
- The default CLIENT_URL is set to `http://localhost:5173` (Vite dev server)

**For Cloudflare Workers deployment:**
- Update `wrangler.json` with your production client URL
- Use `wrangler secret put` for sensitive environment variables

## Development

To install dependencies:
```sh
bun install
```

To run locally:
```sh
bun run dev
```

open http://localhost:3000

## Deployment to Cloudflare Workers

To deploy:
```sh
bun run deploy
```

## Better Auth setup

Run the commands to setup authentication using Sqlite DB

```sh
bunx --bun @better-auth/cli@1.3.4 generate --config src/lib/auth.ts
bunx --bun @better-auth/cli@1.3.4 migrate --config src/lib/auth.ts
```

