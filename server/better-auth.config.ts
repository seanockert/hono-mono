import type { BetterAuthOptions } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';

// Shared auth configuration
export const authConfig: Partial<BetterAuthOptions> = {
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || 'mock',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'mock',
    },
  },
  plugins: [admin(), bearer()],
  user: {
    additionalFields: {
      role: {
        type: 'string' as const,
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },
};
