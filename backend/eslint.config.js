// @ts-check

import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

export default defineConfig(
  {
    // debug-*.js: throwaway scripts, removal pending in docs/TODO.md
    ignores: ['node_modules/', 'dist/', 'coverage/', 'uploads/', 'scheduling-solver/', 'debug-*.js'],
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
