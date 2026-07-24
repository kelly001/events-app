import { defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic'
    }
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/'
      }
    },
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true
  }
})
