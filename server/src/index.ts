import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from "@cloudflare/workers-types";
import { createAuth } from "./lib/auth";
import type { User } from "shared";

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

app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Base route
app.get('/', (c) => c.text('Hola!'));

// Auth routes
app.all("/api/auth/*", async (c) => {
  try {
    const auth = getAuth(c.env);
    return await auth.handler(c.req.raw);
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Protected endpoint example
app.get('/api/protected', async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ 
    headers: c.req.raw.headers 
  });

  if (!session) {
    return c.json({ error: 'Unauthorised' }, 401);
  }

  return c.json({ 
    message: 'Auth successful!', 
    user: session.user as User,
    timestamp: new Date().toISOString()
  });
});

export default app;
