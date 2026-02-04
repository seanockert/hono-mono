import { createAuthClient } from "better-auth/client";
import { authConfig } from "../../better-auth.config";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.SERVER_URL as string,
  plugins: [
    adminClient(),
    inferAdditionalFields({
      user: authConfig.user?.additionalFields,
    }),
  ],
});
