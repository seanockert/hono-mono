import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from "@cloudflare/workers-types";
import { createAuth } from "./lib/auth";

export type CloudflareBindings = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CLIENT_URL?: string;
  DATABASE?: D1Database;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
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

export default app;
