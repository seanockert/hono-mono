import { createAuthClient } from 'better-auth/vue';
import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { TOKEN_KEY, SERVER_URL } from './config';

export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
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
