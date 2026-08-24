# Hono Mono

A TypeScript monorepo framework for building a full-stack app with Hono.

## Yeah, but what is it?

- Frontend app + backend API that runs on a free Cloudflare account, or on any Bun server
- Includes authentication and account signup
- Get started quick: run the setup script to configure db, auth, and scaffold a CRUD model
- Shared Typescript types
- Lightweight and flexible. Designed to be extended upon. Replace the frontend Vue if you want

## Show me a demo

https://hono-mono.seanockert.com - create an account and log in.

Backend API: https://hono-mono.seanockert.workers.dev

The demo app starts with a perfect lighthouse score:

<img width="431" height="141" alt="lighthouse-score" src="https://github.com/user-attachments/assets/1998eb85-b47f-4e35-9e43-358cf75cd129" />


## Getting Started

```bash
git clone https://github.com/seanockert/hono-mono
bun install
bun run setup
bun run dev
```

`bun run setup` creates `server/.env`, `client/.env.local`, and `server/src/honomono.db`. Run once after cloning. It will also prompt you to rename the default `item` model (e.g. "post").

## Architecture

| Layer    | Tech             | Deployment                              |
| -------- | ---------------- | --------------------------------------- |
| Frontend | Vue 3 + Vite     | Cloudflare Pages                        |
| Backend  | Hono             | Cloudflare Workers (D1) or Bun (SQLite) |
| Shared   | TypeScript types | -                                       |
| Auth     | Better Auth      | -                                       |

## Deployment

First-time setup (creates D1 database, generates `wrangler.toml`, sets secrets, runs remote migrations):

```bash
bun run deploy:setup
bun run deploy
```

## Adding a New Model

You can quickly scaffold a new CRUD model (routes, migration, shared types, Vue composable) with:

```bash
bun run generate <modelName> [pluralName] [--force]
# e.g. bun run generate product
# e.g. bun run generate category categories
```

Automatically adds the DB table, mounts the route, re-exports types, creates Vue pages and routes, and runs the migration.
Use `--force` to overwrite files from an earlier run.
The model name must be letters and digits, and the plural must differ from the singular.

### How a model works

The routes come from one factory, `createCrudRoutes` in `server/src/lib/crud.ts`, so a route file is only:

```ts
import { createCrudRoutes } from '../lib/crud';

export default createCrudRoutes('product');
```

It gives you a paginated list, get by id or slug, create, update, and delete.
The client side works the same way through `createResource` in `client/src/lib/resource.ts`.

To add your own endpoints, register them before the CRUD routes.
Hono matches routes in order, so `GET /:idOrSlug` will shadow anything added after it:

```ts
const products = new Hono();
products.get('/featured', handler);
products.route('/', createCrudRoutes('product'));
export default products;
```

## Environment Variables

`bun run setup` creates env files for local development. For production, set these in `server/wrangler.toml` or via Wrangler secrets:

| Variable             | Description                        |
| -------------------- | ---------------------------------- |
| `BETTER_AUTH_SECRET` | Secret key for auth                |
| `BETTER_AUTH_URL`    | Your Workers API URL               |
| `CLIENT_URLS`        | Your Pages frontend URL (for CORS) |

`bun run deploy:setup` writes `client/.env.production` with your Workers URL.
This file is not committed, so run `deploy:setup` before you deploy from a new clone.
Without it the production build points at `http://localhost:3000`.

## Auth

- We've set an additional field `role` on the auth table (server/src/lib/auth.ts). This defaults to "user" but if you change this to "admin" then that admin user can view and edit all other users from the dashboard.
- Better Auth's default scrypt exceeds the Workers 10ms time limit on free plan so we switched to PBKDF2 with 100K iterations. This is still secure but on the lower end of OWASP recommendations so review this if shipping a production app.
- Reads are public. Create needs a session. Update and delete need the caller to be the author, or an admin.
  Change this in `restrict()` in `server/src/lib/crud.ts`.

## Todo

- Add OAuth login eg. Google
