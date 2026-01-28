import { betterAuth } from "better-auth";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { CloudflareBindings } from "../index";
import { authConfig } from "../../better-auth.config";

function createAuth(env?: CloudflareBindings) {
  const isCloudflare = !!env?.DATABASE;
  
  if (isCloudflare) {
    // Use Kysely for D1 (D1 doesn't support SQL RETURNING clause)
    const db = new Kysely({
      dialect: new D1Dialect({
        database: env.DATABASE!,
      }),
    });
    
    return betterAuth({
      ...authConfig,
      socialProviders: {
        github: {
          clientId: env.GITHUB_CLIENT_ID!,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
        },
      },
      database: {
        db,
        type: "sqlite",
      },
      baseURL: env.BETTER_AUTH_URL!,
      secret: env.BETTER_AUTH_SECRET!,
      trustedOrigins: [env.CLIENT_URL!],
    });
  }

  // Local development with Bun SQLite
  const { Database } = require("bun:sqlite");
  const sqlite = new Database("src/auth.db");
  
  return betterAuth({
    ...authConfig,
    database: sqlite,
    baseURL: process.env.BETTER_AUTH_URL as string,
    secret: process.env.BETTER_AUTH_SECRET as string,
    trustedOrigins: [
      process.env.BETTER_AUTH_URL as string,
      process.env.CLIENT_URL as string,
    ],
  });
}

export { createAuth };
