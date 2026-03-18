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
          // Keep auth context + hooks in one chunk to avoid circular deps from barrel re-exports
          if (/[/\\]src[/\\]auth[/\\](contexts|hooks|index\.|usePermissions|idle-timeout)/.test(id)) {
            return 'auth-core';
          }
          if (/[/\\]node_modules[/\\](react|react-dom|react-router|react-helmet)[/\\]/.test(id)) return 'react-vendor';
          if (/[/\\]node_modules[/\\]@supabase[/\\]/.test(id)) return 'supabase-vendor';
          if (/[/\\]node_modules[/\\]@stripe[/\\]/.test(id)) return 'stripe-vendor';
          if (/[/\\]node_modules[/\\]recharts[/\\]/.test(id)) return 'charts-vendor';
          if (/[/\\]node_modules[/\\]axios[/\\]/.test(id)) return 'data-vendor';
          if (/[/\\]node_modules[/\\]lucide-react[/\\]/.test(id)) return 'icons-vendor';
          if (/[/\\]node_modules[/\\]@react-google-maps[/\\]/.test(id)) return 'maps-vendor';
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
