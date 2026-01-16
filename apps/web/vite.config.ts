import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-native': 'react-native-web',
    },
  },
  build: {
    rollupOptions: {
      // Prevent tree-shaking of Tamagui themes
      treeshake: {
        moduleSideEffects: (id) => {
          if (id.includes('@tamagui/themes') || id.includes('tamagui.config')) {
            return true;
          }
          return false;
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@monorepo/ui', 'tamagui', '@tamagui/core', '@tamagui/web', '@tamagui/themes'],
    exclude: ['@monorepo/shared'],
  },
  server: {
    watch: {
      ignored: ['!**/node_modules/@monorepo/shared/**'],
    },
    proxy: {
      '/api/geocode': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, ''),
      },
    },
  },
});
