# scripts/

Developer tooling scripts. These are not part of the server or client build and are not deployed — safe to remove from the repo once a project is set up.

| File | Command | Purpose |
|------|---------|---------|
| `setup.ts` | `bun run setup [model] [plural]` | First-run setup: creates `.env` files, optionally renames the default `item` model, runs migrations |
| `generate-model.ts` | `bun run generate <model> [plural]` | Scaffolds a new CRUD model: SQL migration, server route, shared types, Vue composable and pages, then patches `db.ts`, `index.ts`, `router.ts` |
| `dev.ts` | `bun run dev` | Starts all three dev servers (shared, server, client) in parallel and opens the browser |
| `deploy-setup.ts` | `bun run deploy:setup <appName>` | One-time Cloudflare deployment setup: creates a D1 database, generates `wrangler.toml`, sets secrets, runs remote migrations |
| `lib.ts` | — | Shared utilities used by the scripts above (`resolveModel`, `runMigrate`, `root`) |
