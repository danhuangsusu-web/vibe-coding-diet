import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/ai-eval/**/*.live.test.ts'],
    passWithNoTests: false,
    fileParallelism: false,
    maxWorkers: 1
  }
})
