import { createAuthClient } from "better-auth/client";
import type { auth } from "./auth";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.SERVER_URL as string,
  plugins: [
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});
