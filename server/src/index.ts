import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from "./lib/auth";

const app = new Hono();

app.use(cors({
  origin: process.env.CLIENT_URL as string,
  credentials: true,
}));

// Use the auth handler for auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Authenticated API endpoint
app.get('/api/protected', async (c) => {
  try {
    // Validate the token and retrieve the session using raw headers
    const session = await auth.api.getSession({ 
      headers: c.req.raw.headers 
    });

    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Return success message with user info
    return c.json({ 
      message: 'Authentication successful!', 
      user: session.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});

// Test route
app.get('/', (c) => c.text('Hello App!'));

export default app;

console.log(`Server running at ${process.env.SERVER_URL}`);
