import { defineConfig } from 'vitest/config'
import path from 'node:path'

// One run covers every workspace. MindGym's own code imports '@/…' from its
// app root; packages/core uses relative imports only.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { '@': path.resolve(__dirname, 'apps/mindgym') } },
        test: { name: 'mindgym', include: ['apps/mindgym/lib/**/*.test.ts'] },
      },
      { test: { name: 'core', include: ['packages/core/src/**/*.test.ts'] } },
    ],
  },
})
