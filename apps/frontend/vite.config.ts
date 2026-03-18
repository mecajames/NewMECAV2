import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep auth context + hooks in a single chunk to avoid circular deps from barrel re-exports
          if (id.includes('/src/auth/contexts/') || id.includes('/src/auth/hooks/') || id.includes('/src/auth/index.') || id.includes('/src/auth/usePermissions') || id.includes('/src/auth/idle-timeout') || id.includes('\\src\\auth\\contexts\\') || id.includes('\\src\\auth\\hooks\\') || id.includes('\\src\\auth\\index.') || id.includes('\\src\\auth\\usePermissions') || id.includes('\\src\\auth\\idle-timeout')) {
            return 'auth-core';
          }
          // Core React framework - cached long-term
          if (['react', 'react-dom', 'react-router-dom', 'react-helmet-async'].some(dep => id.includes(`/node_modules/${dep}/`) || id.includes(`\\node_modules\\${dep}\\`))) {
            return 'react-vendor';
          }
          if (id.includes('/node_modules/@supabase/') || id.includes('\\node_modules\\@supabase\\')) {
            return 'supabase-vendor';
          }
          if (id.includes('/node_modules/@stripe/') || id.includes('\\node_modules\\@stripe\\')) {
            return 'stripe-vendor';
          }
          if (id.includes('/node_modules/recharts/') || id.includes('\\node_modules\\recharts\\')) {
            return 'charts-vendor';
          }
          if (id.includes('/node_modules/axios/') || id.includes('\\node_modules\\axios\\')) {
            return 'data-vendor';
          }
          if (id.includes('/node_modules/lucide-react/') || id.includes('\\node_modules\\lucide-react\\')) {
            return 'icons-vendor';
          }
          if (id.includes('/node_modules/@react-google-maps/') || id.includes('\\node_modules\\@react-google-maps\\')) {
            return 'maps-vendor';
          }
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
      '/sitemap.xml': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/robots.txt': {
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
