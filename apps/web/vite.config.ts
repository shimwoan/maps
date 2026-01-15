import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tamaguiPlugin } from '@tamagui/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tamaguiPlugin({
      config: './src/tamagui.config.ts',
      components: ['tamagui', '@monorepo/ui'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@monorepo/ui'],
    exclude: ['@monorepo/shared'],
  },
  server: {
    watch: {
      ignored: ['!**/node_modules/@monorepo/shared/**'],
    },
  },
});
