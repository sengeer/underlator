import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Vitest для unit-тестов слоя `shared/api`.
 * Отдельный конфиг, чтобы не смешивать React-плагины Vite с клиентскими тестами.
 */
export default defineConfig({
  root,
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    unstubEnvs: true,
  },
});
