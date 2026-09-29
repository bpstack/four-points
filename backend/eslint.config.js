// @ts-check

import js from '@eslint/js'
import { defineConfig, includeIgnoreFile } from 'eslint/config'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

// Same files as Prettier and git: local-only files must not break the lint
const gitignores = ['.gitignore', '../.gitignore'].map((p) =>
  fileURLToPath(new URL(p, import.meta.url))
)

export default defineConfig(
  includeIgnoreFile(gitignores, { gitignoreResolution: true }),
  {
    // debug-*.js: throwaway scripts, removal pending in docs/TODO.md
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'uploads/',
      'scheduling-solver/',
      'debug-*.js',
    ],
  },
  {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // 341 existing uses: warn until they are typed, so new code is still flagged
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': ['error', { destructuring: 'all' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  // Last: turns off rules that clash with Prettier and reports formatting (.prettierrc) as errors
  prettierRecommended
)
