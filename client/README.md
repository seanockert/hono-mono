# Vue + TypeScript + Vite Client

Frontend client deployed to Cloudflare Pages.

## Environment Variables

Production configuration is in `.env.production` (committed to git).

**For local development**, create `.env.local`:

```env
VITE_SERVER_URL=http://localhost:3000
```

Vite automatically uses `.env.production` when building for production.

## Development

Install dependencies and start the dev server:

```sh
bun install
bun run dev
```

Open http://localhost:5173

## Building

Build for production:

```sh
bun run build
```

Preview production build locally:

```sh
bun run preview
```

## Deployment to Cloudflare Pages

Deploy to Cloudflare Pages:

```sh
# Production deployment
bun run deploy

# Development deployment
bun run deploy:dev
```

The deployment process:

1. Builds the Vue application with Vite
2. Compiles TypeScript and optimizes assets
3. Deploys the `dist` folder to Cloudflare Pages via Wrangler

The production build automatically uses `.env.production` for environment variables.
