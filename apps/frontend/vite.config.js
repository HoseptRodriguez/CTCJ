import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // bind all interfaces so a phone on the same WiFi can reach it
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Avatar images (Phase 2) -- served by the backend's express.static
      // mount, same proxy pattern as /api so relative <img src> URLs
      // returned by the API resolve correctly from the frontend's own origin.
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: false,
    css: false,
  },
});
