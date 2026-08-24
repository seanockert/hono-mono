# scripts/

Developer tooling scripts. These are not part of the server or client build and are not deployed - safe to remove from the repo once a project is set up.

| File                | Command                                       | Purpose                                                                                                                      |
| ------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `setup.ts`          | `bun run setup [model] [plural]`              | First-run setup: creates `.env` files, optionally renames the default `item` model, rebuilds shared types, runs migrations   |
| `generate-model.ts` | `bun run generate <model> [plural] [--force]` | Scaffolds a new CRUD model from `templates/`, then patches `db.ts`, `index.ts`, the shared types barrel, and `router.ts`     |
| `dev.ts`            | `bun run dev`                                 | Starts all three dev servers (shared, server, client) in parallel and opens the browser                                      |
| `deploy-setup.ts`   | `bun run deploy:setup <appName>`              | One-time Cloudflare deployment setup: creates a D1 database, generates `wrangler.toml`, sets secrets, runs remote migrations |
| `lib.ts`            | -                                             | Shared helpers (`resolveModel`, `nextMigrationNumber`, `runMigrate`, `buildShared`, `root`)                                  |

## templates/

One file per generated artefact.
The generator substitutes four placeholders: `__model__`, `__Model__`, `__models__`, `__Models__`.

Keep these in step with the default `item` model.
The route and composable templates are thin because the logic lives in `server/src/lib/crud.ts` and `client/src/lib/resource.ts`.

## Model names

`resolveModel` rejects a name that would produce broken code:

- It must be letters and digits, starting with a letter.
- It must not shadow a local in the templates (`status`, `title`, `db`, and similar).
- The plural must differ from the singular, or the generated pages would overwrite each other.

## Migrations

`nextMigrationNumber` reads `server/migrations/` and returns the next zero-padded prefix, for example `0004`.
This matches how Wrangler numbers and orders D1 migrations.
