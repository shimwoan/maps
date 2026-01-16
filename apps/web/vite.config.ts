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
  optimizeDeps: {
    include: ['@monorepo/ui', 'tamagui', '@tamagui/core', '@tamagui/web'],
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
