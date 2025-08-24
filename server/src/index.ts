import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from "./lib/auth";

const app = new Hono();

app.use(cors({
  origin: process.env.CLIENT_URL as string,
  credentials: true,
}));

// For auth routes, use the auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get('/', (c) => c.text('Hello App!'));

export default app;

console.log(`Server running at ${process.env.SERVER_URL}`);
