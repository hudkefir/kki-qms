import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['.trycloudflare.com', '.kefirkultures.com', 'qms.kefirkultures.com', 'all'],
    proxy: {
      '/api': 'http://localhost:3002',
      '/ws': { target: 'ws://localhost:3002', ws: true }
    }
  }
});
