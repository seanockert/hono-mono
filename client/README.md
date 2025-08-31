# Vue + TypeScript + Vite Client

## Environment Variables

Create environment files for different environments:

**For development (.env.development):**
```
VITE_SERVER_URL=http://localhost:3000
```

**For production (.env.production):**
```
VITE_SERVER_URL=https://your-worker.your-subdomain.workers.dev
```

The client will automatically use the appropriate environment file based on the build mode.

## Development

```sh
bun install
bun run dev
```
