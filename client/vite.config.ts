import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      zod: 'zod/v4-mini',
    },
  },
  server: {
    watch: {
      ignored: ['!**/node_modules/shared/**'],
    },
  },
  optimizeDeps: {
    exclude: ['shared'],
  },
});
