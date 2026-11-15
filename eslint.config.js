import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'public/audio', 'test-results', 'playwright-report', 'mobile'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      // Render SOF bo'lishi shart: vaqt `lib/clock.ts` (useNow/nowMs) orqali,
      // prop o'zgarsa holat render paytida moslanadi (effect'da setState yo'q).
      // Ogohlantirishlar ham CI'da xato (`lint:ci` → --max-warnings 0).
      'react-hooks/purity': 'error',
      'react-hooks/set-state-in-render': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.ts', 'vitest.config.ts'],
    languageOptions: { globals: globals.node },
  },
)
