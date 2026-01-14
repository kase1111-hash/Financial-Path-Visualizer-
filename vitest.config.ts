import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/main.ts'],
    },
  },
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
});
