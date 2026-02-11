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
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React framework - cached long-term
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
          // Supabase client
          'supabase-vendor': ['@supabase/supabase-js'],
          // Stripe (loaded on-demand via lazy routes, but cached separately)
          'stripe-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          // Charts library (only used on dashboard)
          'charts-vendor': ['recharts'],
          // HTTP client
          'data-vendor': ['axios'],
          // UI icons
          'icons-vendor': ['lucide-react'],
        },
      },
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
