import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from "@cloudflare/workers-types";
import { createAuth } from "./lib/auth";
import type { Fetcher } from '@cloudflare/workers-types';

export type CloudflareBindings = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CLIENT_URL?: string;
  DATABASE?: D1Database;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  ASSETS?: Fetcher;
};

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Cache auth instance per environment
let authInstance: ReturnType<typeof createAuth> | null = null;

const getAuth = (env: CloudflareBindings) => {
  if (!authInstance) {
    authInstance = createAuth(env);
  }
  return authInstance;
};

app.use(cors({
  origin: (origin, c) => c.env?.CLIENT_URL || process.env.CLIENT_URL as string,
  credentials: true,
}));

// Auth routes  
app.on(["POST", "GET"], "/api/auth/*", (c) => getAuth(c.env).handler(c.req.raw));

// Protected endpoint
app.get('/api/protected', async (c) => {
  const session = await getAuth(c.env).api.getSession({ 
    headers: c.req.raw.headers 
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({ 
    message: 'Authentication successful!', 
    user: session.user,
    timestamp: new Date().toISOString()
  });
});

// Serve static assets and SPA fallback
app.use('*', async (c) => {
  if (!c.env.ASSETS) {
    return c.notFound();
  }

  const assetResponse = await c.env.ASSETS.fetch(c.req.url);
  
  // If asset exists, return it
  if (assetResponse.status !== 404) {
    return assetResponse;
  }
  
  // For SPA routes (not found assets), serve index.html
  const url = new URL(c.req.url);
  const indexUrl = `${url.origin}/index.html`;
  return c.env.ASSETS.fetch(indexUrl);
});

export default app;
