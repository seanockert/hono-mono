import { betterAuth } from "better-auth";
import type { CloudflareBindings } from "../index";

export const auth = (env?: CloudflareBindings) => {
  const isCloudflare = !!env?.DATABASE;
  
  const baseConfig = {
    emailAndPassword: { enabled: true },
    socialProviders: { 
      github: { 
        clientId: (env?.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID) as string, 
        clientSecret: (env?.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET) as string, 
      }, 
    },
    user: {
      additionalFields: {
        // Added a role field to the user
        role: {
          type: "string" as const,
          required: false,
          defaultValue: "user",
          input: false, // Can't set at signup
        },
      },
    },
    databaseHooks: {
      user: {
        update: {
          before: async (userData: any) => {
            // Automatically update the updatedAt field when data updates
            return { data: { ...userData, updatedAt: new Date() } };
          },
        },
      },
    },
  };

  if (isCloudflare) {
    // Cloudflare Workers with D1
    return betterAuth({
      ...baseConfig,
      database: env.DATABASE!,
      baseURL: env.BETTER_AUTH_URL!,
      secret: env.BETTER_AUTH_SECRET!,
      trustedOrigins: [env.CLIENT_URL!],
    });
  } else {
    // Using bun:sqlite directly for local development
    try {
      const { Database } = require("bun:sqlite");
      return betterAuth({
        ...baseConfig,
        database: new Database("src/auth.db"),
        trustedOrigins: [
          process.env.SERVER_URL as string,
          process.env.CLIENT_URL as string,
        ],
      });
    } catch (error) {
      throw new Error("Local development requires bun:sqlite");
    }
  }
};
