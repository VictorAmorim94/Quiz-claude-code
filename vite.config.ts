/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Node >= 25 expõe um `localStorage` global que esconde o do jsdom.
    poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
  },
});
