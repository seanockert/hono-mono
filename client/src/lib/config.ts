export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const TOKEN_KEY = 'better-auth.token';

export const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};
