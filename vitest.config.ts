import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/shared/src/**/*.test.ts',
      'packages/nutrition/src/**/*.test.ts',
      'apps/miniprogram/config/**/*.test.ts',
      'apps/miniprogram/src/**/*.test.ts',
      'apps/server/**/*.test.ts'
    ],
    passWithNoTests: false
  }
})
