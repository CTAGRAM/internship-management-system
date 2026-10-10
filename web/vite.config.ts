import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = process.env.PORT || 4000;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev the UI runs on 5173 and proxies the API to the Express server,
    // so there is no CORS or base-URL configuration to get wrong.
    proxy: {
      '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
