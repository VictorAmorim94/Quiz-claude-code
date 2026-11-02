/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Porta fixa: o backend (CORS via ALLOWED_ORIGIN) só aceita esta origem em dev.
  // Sem strictPort, o Vite pula em silêncio para 5174 se a 5173 estiver ocupada
  // e todas as chamadas ao Supabase passam a ser bloqueadas pelo navegador.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Node >= 25 expõe um `localStorage` global que esconde o do jsdom.
    poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
  },
});
