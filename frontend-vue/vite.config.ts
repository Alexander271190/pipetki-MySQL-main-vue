import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'https://localhost', changeOrigin: true, secure: false },
    },
  },
  build: { outDir: 'dist', sourcemap: false, emptyOutDir: true },
});
