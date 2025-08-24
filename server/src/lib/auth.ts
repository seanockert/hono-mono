import { betterAuth } from "better-auth";
import { Database } from "bun:sqlite";

const db = new Database("src/auth.db");
  
export const auth = betterAuth({
    database: db,
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [
      process.env.SERVER_URL as string,
      process.env.CLIENT_URL as string,
    ],
    socialProviders: { 
      github: { 
        clientId: process.env.GITHUB_CLIENT_ID as string, 
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
      }, 
    }, 
});
