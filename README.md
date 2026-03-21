# Hono Mono

A TypeScript monorepo framework for building a full-stack app with Hono.

## Yeah but what is it?

- Frontend SPA + backend API that runs on a free Cloudflare account or on any Bun server
- Get started quick: run the setup script to configure everything a scaffold a CRUD models
- Includes authentication and account signup
- Shared types across backend and frontend
- Lightweight and flexible. Designed to be extended upon. Replace the frontend Vue if you want

## Getting Started

```bash
git clone https://github.com/seanockert/hono-mono
bun install
bun run setup
bun run dev
```

`bun run setup` creates `server/.env`, `client/.env.local`, and `server/src/honomono.db` — run once after cloning.

Optionally rename the default "item" model during setup:

```bash
bun run setup post    # Renames all "item" files and references to "post"
```

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

Start all services in development mode:

```bash
bun run dev
```

This will start:

- Shared types watcher
- Backend server at http://localhost:3000
- Frontend dev server at http://localhost:5173

## Deployment

First-time setup (creates D1 database, generates `wrangler.toml`, sets secrets, runs remote migrations):

```bash
bun run deploy:setup my-app
```

Then deploy:

```bash
bun run deploy
```

This will deploy:
1. the Frontend (client) to Cloudflare Pages
2. the Backend (server) to Cloudflare Workers

## Adding a New Model

Scaffold a new CRUD model (routes, migration, shared types, Vue composable):

```bash
bun run generate <modelName> [pluralName]
# e.g. bun run generate product
# e.g. bun run generate category categories
```

This generates all files and automatically:

1. Adds `<Model>Table` to `AppDatabase` in `server/src/lib/db.ts`
2. Mounts the route in `server/src/index.ts`
3. Re-exports the type from `shared/src/types/index.ts`
4. Creates list and detail Vue pages in `client/src/pages/`
5. Adds routes to `client/src/router.ts`
6. Runs the migration

The generated route includes paginated list, get by id/slug, create, update, and delete — identical in structure to the built-in `items` model.

## Configuration

### Server Environment Variables

`bun run setup` creates `server/.env` from `server/.env.example` with a generated secret. For production, set these in `server/wrangler.toml` or via Wrangler secrets:

- `BETTER_AUTH_SECRET`: Secret key for auth
- `BETTER_AUTH_URL`: Your Workers API URL
- `CLIENT_URLS`: Your Pages frontend URL (for CORS)
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID (optional)
- `GITHUB_CLIENT_SECRET`: GitHub OAuth secret (optional)

### Client Environment Variables

`bun run setup` creates `client/.env.local` for local development. Production settings are in `client/.env.production` (committed).
