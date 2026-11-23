import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Las pruebas de base de datos comparten tablas: se ejecutan en serie.
    fileParallelism: false,
  },
});
