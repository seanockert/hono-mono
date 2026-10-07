# Hono Mono

A TypeScript monorepo framework for building a full-stack app with Hono.

## Yeah, but what is it?

- Frontend app + backend API that runs on a free Cloudflare account, or on any Bun server
- Includes authentication and account signup
- Get started quick: run the setup script to configure db, auth, and scaffold a CRUD model
- Server-rendered admin at `/admin` for your models and users. No client JavaScript
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

## Admin

The API serves an admin section at `/admin`, for example `http://localhost:3000/admin`.
Make an admin with `bun run admin <email>`, then sign in on that page.

It is on the API origin, not the frontend, for three reasons.
The session cookie is already same-origin there, so there is no CORS and no bearer token.
No admin code goes to the browsers of ordinary visitors.
It keeps working if you replace the Vue frontend.

There is no client JavaScript.
Every action is a plain form POST and a redirect, with a strict `script-src 'none'` policy.

One generic view serves every model, driven by the `ADMIN_MODELS` list in `server/src/lib/models.ts`.
`bun run generate <model>` adds to that list, so a new model gets an admin section with no hand-editing.

User actions go through Better Auth's own API, so its permission checks still run.
The admin also refuses any action that targets your own account, so you cannot demote, ban, or delete yourself.

## Errors and health

Every failed request answers with `{ "error": "..." }` and the matching HTTP status.
The status already says the request failed, so the body does not repeat it.

Throw Hono's `HTTPException` to choose the status:

```ts
throw new HTTPException(403, { message: 'Not your item' });
```

Any other error becomes a 500 and is logged with its stack.

`GET /health` returns `{ ok, db }` for uptime monitors and deploy checks.
`db` is the result of a `SELECT 1`, because the Worker can be healthy while the database is not.
It answers 503 if the database is unreachable.

Security headers are set on both origins: by `secureHeaders()` for the API, and by `client/public/_headers` for Cloudflare Pages.
The Pages policy allows any HTTPS origin for `connect-src`, because the API URL differs per deployment.
Pin it to your own API URL once you know it.

## Environment Variables

`bun run setup` creates env files for local development. For production, set these in `server/wrangler.toml` or via Wrangler secrets:

| Variable             | Description                        |
| -------------------- | ---------------------------------- |
| `BETTER_AUTH_SECRET` | Secret key for auth                |
| `BETTER_AUTH_URL`    | Your Workers API URL               |
| `CLIENT_URLS`        | Your Pages frontend URL (for CORS) |
| `RESEND_API_KEY`     | Optional. Sends real email         |
| `EMAIL_FROM`         | Optional. Sender address           |

`bun run deploy:setup` writes `client/.env.production` with your Workers URL.
This file is not committed, so run `deploy:setup` before you deploy from a new clone.
Without it the production build points at `http://localhost:3000`.

## Auth

- We've set an additional field `role` on the auth table (server/src/lib/auth.ts).
  It defaults to "user".
  Better Auth blocks writes to `role`, so make the first admin with the bootstrap script:

```bash
bun run admin you@example.com            # local database
bun run admin you@example.com --remote   # production D1
bun run admin you@example.com --revoke   # back down to "user"
```

Sign up through the UI first, then run the script and log in again.
An admin can then open `/admin` on the API origin.

- Better Auth's default scrypt exceeds the Workers 10ms time limit on free plan so we switched to PBKDF2 with 100K iterations. This is still secure but on the lower end of OWASP recommendations so review this if shipping a production app.
- Published rows are public. Authors also see their own drafts, and admins see all rows.
  Create needs a session. Update and delete need the caller to be the author, or an admin.
  Change this in `readable()` and `restrict()` in `server/src/lib/crud.ts`.

### Rate limiting

Better Auth rate limits the auth routes, backed by the database rather than memory.
On Workers each isolate has its own memory, so an in-memory counter would not hold across isolates.

| Route                             | Limit           |
| --------------------------------- | --------------- |
| `/sign-in/email`                  | 5 per minute    |
| `/sign-up/email`                  | 5 per 5 minutes |
| `/request-password-reset`         | 3 per 5 minutes |
| everything else under `/api/auth` | 100 per minute  |

Change these in `authConfig.rateLimit` in `server/src/lib/auth.ts`.
The limits apply in local development too, so 5 wrong passwords in a minute will lock you out for a minute.

On Cloudflare the limit counts per client IP, read from the `CF-Connecting-IP` header that the edge sets.
If you deploy the Bun server behind your own proxy, set `advanced.ipAddress.ipAddressHeaders` to the header your proxy sets.
Without a trusted header Better Auth counts every caller in one shared bucket, which lets one attacker lock out everybody.

A deployed app needs the new table:

```bash
cd server && bun run migrate:remote
```

### Email and password reset

Password reset works with no configuration.
Workers has no outbound SMTP, so mail goes over HTTP through one adapter in `server/src/lib/email.ts`.

Without `RESEND_API_KEY` the adapter prints the message to the server console.
Copy the reset link from there to finish the flow in local development.
Set `RESEND_API_KEY` to send real email.
`EMAIL_FROM` defaults to Resend's sandbox sender, which needs no verified domain.

To use a different provider, replace the one `fetch` call in `email.ts`.

Email verification uses the same adapter but is off by default, because it would make sign-up depend on mail delivery.
To turn it on, add `requireEmailVerification: true` to `emailAndPassword` in `server/src/lib/auth.ts`.

## Todo

- Add OAuth login eg. Google
