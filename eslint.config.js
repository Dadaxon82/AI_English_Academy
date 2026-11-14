import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'public/audio'] },
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
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Ilova ataylab soatga asoslangan (jonli taymerlar, SRS due vaqtlari):
      // render paytida Date.now() o'qish va store'dan keyin keladigan holatni
      // effect orqali sinxronlash — loyiha dizayni. Qoidalar xato emas,
      // ogohlantirish sifatida saqlanadi (kodda izohlanadigan joylar).
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      // Store har safar yangi `actions` obyekti qaytaradi (useCallback
      // bilan stabil funksiyalar ichida). Qo'lda deps ro'yxatiga `actions`
      // yozish qoidani buzadi — shuning uchun bu warnings darajasida.
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
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
