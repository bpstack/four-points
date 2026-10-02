import { configDefaults, defineConfig } from 'vitest/config'

// These import config/db.ts, which needs the database credentials in .env.
// SKIP_DB_TESTS=1 (set in CI) leaves them out.
const NEEDS_DATABASE = [
  'tests/auth/user-repository-login.test.ts',
  'tests/checklist/checklist.test.ts',
  'tests/fnb/pdf-parser.test.ts',
  'tests/fnb/repository.test.ts',
  'tests/scheduling/corpus.test.ts',
  'tests/scheduling/solver-parity.test.ts',
  'tests/scheduling/employee-requests-repository.test.ts',
]

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: process.env.SKIP_DB_TESTS
      ? [...configDefaults.exclude, ...NEEDS_DATABASE]
      : configDefaults.exclude,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['services/scheduling/**/*.ts'],
    },
    testTimeout: 10000,
  },
})
