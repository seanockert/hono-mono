# Hono Mono

A full-stack TypeScript monorepo starter with shared types, using Bun, Hono, Vue, and Vite.

## Architecture

- **Frontend**: Vue 3 + Vite, deployed to Cloudflare Pages
- **Backend**: Hono API, deployed to Cloudflare Workers
- **Shared**: Common TypeScript types shared between frontend and backend
- **Auth**: Better Auth with Cloudflare D1 database
- **Items model**: Base model for creating CRUD items

## Demo

Create a user account and login: https://hono-mono.seanockert.com

Backend API hosted at https://hono-mono-app.seanockert.workers.dev

<img width="768" alt="dashboard" src="https://github.com/user-attachments/assets/3e99a011-fae0-41f6-80d8-31954c11b2d4" />

<img width="768" alt="items-list" src="https://github.com/user-attachments/assets/8b3ae36f-41f0-46ff-8b26-2dd3e0516436" />


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

Build everything:

```bash
bun run build
```

## Deployment

```bash
bun run deploy
```

This will deploy 
1. the Frontend (client) to Cloudflare Pages
2. the Backend (server) to Cloudflare Workers

## Adding a New Model

Scaffold a new CRUD model (routes, migration, shared types, Vue composable):

```bash
bun run scripts/generate-model.ts <modelName>
# e.g. bun run scripts/generate-model.ts product
```

Then complete the four steps printed by the script:

1. Add `<Model>Table` to `AppDatabase` in `server/src/lib/db.ts`
2. Mount the route in `server/src/index.ts`
3. Re-export the type from `shared/src/types/index.ts`
4. Run the migration: `cd server && bun run migrate`

The generated route includes paginated list, get by id/slug, create, update, and delete — identical in structure to the built-in `items` model.

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
