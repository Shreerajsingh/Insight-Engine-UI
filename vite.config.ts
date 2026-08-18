import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The API is proxied rather than called cross-origin in development, so the app talks to its own
 * origin and `VITE_API_BASE` can stay empty. The backend's CORS allowlist covers the direct case
 * too — this just means the common setup needs no configuration at all.
 *
 * The proxy target comes from `loadEnv` rather than `process.env`: this file runs in Node, but
 * reaching for `process` here would mean depending on `@types/node` for one string. `loadEnv` is
 * Vite's own reader for the `.env` files the variable is documented in.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
