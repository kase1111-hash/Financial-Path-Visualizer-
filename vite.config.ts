import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@models': resolve(__dirname, 'src/models'),
      '@engine': resolve(__dirname, 'src/engine'),
      '@scanner': resolve(__dirname, 'src/scanner'),
      '@storage': resolve(__dirname, 'src/storage'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@data': resolve(__dirname, 'src/data'),
      '@workers': resolve(__dirname, 'src/workers'),
    },
  },
  build: {
    target: 'ES2022',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
});
