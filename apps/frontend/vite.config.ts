import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
      '@newmeca/shared',
      '@newmeca/shared > zod',
    ],
    // Force prebundle linked packages
    force: true,
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /@newmeca\/shared/],
      transformMixedEsModules: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    headers: {
      // Allow compute-pressure API for YouTube embeds
      'Permissions-Policy': 'compute-pressure=*',
    },
  },
});
