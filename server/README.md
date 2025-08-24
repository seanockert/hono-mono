To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

## Better Auth setup

Run the commands to setup authentication using Sqlite DB

```sh
bunx --bun @better-auth/cli@1.3.4 generate --config src/lib/auth.ts
bunx --bun @better-auth/cli@1.3.4 migrate --config src/lib/auth.ts
```

