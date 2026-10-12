import eslint from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', '.wxt/**', '.output/**', 'coverage/**', 'public/**'] },
  {
    files: ['**/*.mjs'],
    extends: [eslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
  {
    files: [
      'entrypoints/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'features/**/ui/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'wxt/browser', message: 'Use a browser adapter from lib/browser.' },
            { name: '@wxt-dev/browser', message: 'Use a browser adapter from lib/browser.' },
            { name: 'webextension-polyfill', message: 'Use a browser adapter from lib/browser.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'chrome', message: 'Use a browser adapter from lib/browser.' },
        { name: 'browser', message: 'Use a browser adapter from lib/browser.' },
      ],
    },
  },
);
