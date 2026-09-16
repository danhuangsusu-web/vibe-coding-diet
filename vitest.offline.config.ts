import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/offline-loop.live.ts'],
    passWithNoTests: false,
    testTimeout: 30_000
  }
})
