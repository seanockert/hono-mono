## Environment Variables

The server uses environment variables configured in `wrangler.toml`:

- `BETTER_AUTH_URL`: Your Cloudflare Workers API URL (e.g., `https://your-app-name.workers.dev`)
- `CLIENT_URL`: Your Cloudflare Pages frontend URL (e.g., `https://your-client-name.pages.dev`)
- `BETTER_AUTH_SECRET`: Secret key for Better Auth (use `wrangler secret put BETTER_AUTH_SECRET`)
- `GITHUB_CLIENT_ID`: GitHub OAuth application client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth secret (use `wrangler secret put GITHUB_CLIENT_SECRET`)

**For local development:**

- The CLIENT_URL can be set to `http://localhost:5173` for the Vite dev server
- Set environment variables in a `.dev.vars` file in the server directory

**For Cloudflare Workers deployment:**

- Update `wrangler.toml` with your production URLs
- Use `wrangler secret put <KEY>` for sensitive environment variables

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

Build and deploy to Cloudflare Workers:

```sh
# Production deployment
bun run deploy

# Development deployment
bun run deploy:dev
```

The deployment process:

1. Builds the server code using esbuild
2. Bundles all dependencies
3. Deploys to Cloudflare Workers via Wrangler

## Better Auth setup

Run the commands to setup authentication using Sqlite DB

```sh
bunx --bun @better-auth/cli@1.3.4 generate --config src/lib/auth.cli.ts
bunx --bun @better-auth/cli@1.3.4 migrate --config src/lib/auth.cli.ts
```
