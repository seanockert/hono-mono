import { createAuthClient } from "better-auth/vue"
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
  plugins: [
    adminClient(),
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: false,
          input: false
        }
      }
    })
  ]
})