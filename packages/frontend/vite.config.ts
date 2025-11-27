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
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Performance optimization for production builds
    // Requirement 10: System Performance & Availability

    // Minify with esbuild (faster than terser)
    minify: 'esbuild',

    // Optimize chunk sizes
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['antd'],
          'vendor-state': ['zustand'],
          'vendor-http': ['axios'],
        },
        // Asset file naming for CDN caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg/.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          } else if (ext === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        // Chunk file naming for CDN caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        // Entry file naming
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Increase chunk size warning threshold
    chunkSizeWarningLimit: 1000,

    // Source maps for production debugging (optional, disable for smaller bundle)
    sourcemap: false,

    // CSS code splitting
    cssCodeSplit: true,

    // Report compressed size
    reportCompressedSize: true,
  },

  // Environment variables for CDN configuration
  define: {
    __CDN_URL__: JSON.stringify(process.env.VITE_CDN_URL || ''),
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || '/api'),
  },
});
