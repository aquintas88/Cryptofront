import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Las pruebas de base de datos comparten tablas: se ejecutan en serie.
    fileParallelism: false,
    // Pruebas de base de datos en una máquina con carga: 5 s se quedaban cortos a veces.
    testTimeout: 15_000,
  },
});
