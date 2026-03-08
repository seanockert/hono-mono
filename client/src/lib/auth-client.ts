import { createAuthClient } from 'better-auth/vue';
import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';

const TOKEN_KEY = 'better-auth.token';

export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL || 'http://localhost:3000',
  fetchOptions: {
    onResponse(context) {
      const token = context.response.headers.get('set-auth-token');
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
    },
    onRequest(context) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        context.headers.set('Authorization', `Bearer ${token}`);
      }
    },
  },
  plugins: [
    adminClient(),
    inferAdditionalFields({
      user: {
        role: {
          type: 'string',
          required: false,
          input: false,
        },
      },
    }),
  ],
});
