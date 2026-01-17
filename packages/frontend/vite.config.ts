/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    /* VitePWA disabled for build performance
    VitePWA({
      registerType: 'autoUpdate',
      ...
    }), 
    */
  ],
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
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
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
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons', '@ant-design/x'],
          'vendor-framer': ['framer-motion'],
          'vendor-utils': ['axios', 'dayjs', 'i18next', 'react-i18next', 'socket.io-client', 'zustand'],
          'vendor-ui': ['@hello-pangea/dnd', 'lucide-react', 'react-markdown', 'remark-gfm'],
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
    chunkSizeWarningLimit: 2000,

    // Source maps for production debugging (optional, disable for smaller bundle)
    sourcemap: false,

    // CSS code splitting
    cssCodeSplit: true,

    // Report compressed size
    reportCompressedSize: false,
  },

  // Vitest test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/dev/',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.setup.ts',
      ],
      include: ['src/**/*.{ts,tsx}'],
    },
  },

  // Environment variables for CDN configuration
  define: {
    __CDN_URL__: JSON.stringify(process.env.VITE_CDN_URL || ''),
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || '/api'),
  },
});
