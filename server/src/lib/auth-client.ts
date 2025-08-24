import { createAuthClient } from "better-auth/client";
import type { auth } from "./auth";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.SERVER_URL as string,
  plugins: [inferAdditionalFields<typeof auth>()],
});
