import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { auth, type CloudflareBindings } from "./lib/auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(cors({
  origin: (origin, c) => c.env?.CLIENT_URL || process.env.CLIENT_URL as string,
  credentials: true,
}));

// Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => auth(c.env).handler(c.req.raw));

// Protected endpoint
app.get('/api/protected', async (c) => {
  try {
    const session = await auth(c.env).api.getSession({ 
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
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});

// Serve static files and SPA
app.use('*', serveStatic({ root: './', manifest: {} }));

export default app;

console.log(`Server running at ${process.env.SERVER_URL}`);
