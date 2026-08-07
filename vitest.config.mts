import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/*
 * The `obsidian` module only exists inside the Obsidian runtime, so tests
 * resolve it to a hand-written stub. That keeps the pure-logic units (parsers,
 * normalizer, cache, state machine, positioner) runnable under plain Node with
 * no Electron and no network.
 */
export default defineConfig({
  resolve: {
    alias: {
      obsidian: fileURLToPath(new URL('./tests/mocks/obsidian.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
