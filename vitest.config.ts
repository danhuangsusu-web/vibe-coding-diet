import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __API_BASE_URL__: JSON.stringify('http://api.test')
  },
  test: {
    environment: 'node',
    include: [
      'packages/shared/src/**/*.test.ts',
      'packages/nutrition/src/**/*.test.ts',
      'apps/miniprogram/config/**/*.test.ts',
      'apps/miniprogram/src/**/*.test.ts',
      'apps/server/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    passWithNoTests: false
  }
})
