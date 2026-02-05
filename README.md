# Hono Mono

A full-stack TypeScript monorepo starter with shared types, using Bun, Hono, Vue, and Vite.

## Architecture

- **Frontend**: Vue 3 + Vite, deployed to Cloudflare Pages
- **Backend**: Hono API, deployed to Cloudflare Workers
- **Shared**: Common TypeScript types shared between frontend and backend
- **Auth**: Better Auth with Cloudflare D1 database

## Demo

Create a user account and login: https://hono-mono.seanockert.com

Backend API hosted at https://hono-mono-app.seanockert.workers.dev

## Development

Install dependencies:

```bash
bun install
```

Start all services in development mode:

```bash
bun run dev
```

This will start:

- Shared types watcher
- Backend server at http://localhost:3000
- Frontend dev server at http://localhost:5173

## Building

Build all packages:

```bash
bun run build
```

Build individual packages:

```bash
bun run build:server  # Backend only
bun run build:client  # Frontend only
bun run build:shared  # Shared types only
```

## Deployment

### Backend (Cloudflare Workers)

```bash
# Deploy to production
bun run deploy:server
# or
cd server && bun run deploy
```

### Frontend (Cloudflare Pages)

```bash
# Deploy to production
bun run deploy:client
# or
cd client && bun run deploy
```

### Deploy Both

```bash
bun run deploy:all
```

## Configuration

### Server Environment Variables

Set these in `server/wrangler.toml` or via Wrangler secrets:

- `BETTER_AUTH_URL`: Your Workers API URL
- `CLIENT_URL`: Your Pages frontend URL (for CORS)
- `BETTER_AUTH_SECRET`: Secret key for auth (set as secret)
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth secret (set as secret)

### Client Environment Variables

Production settings are in `client/.env.production` (committed).

For local development, create `client/.env.local`:

```env
VITE_SERVER_URL=http://localhost:3000
```
