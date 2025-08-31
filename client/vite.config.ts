import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    __SERVER_URL__: JSON.stringify(process.env.VITE_SERVER_URL || 'http://localhost:3000'),
  },
})
