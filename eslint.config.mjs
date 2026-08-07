import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['main.js', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    rules: {
      /*
       * The Obsidian plugin guidelines this project is held to, encoded as
       * lint rules so a violation fails CI rather than a human review.
       */

      // Guideline: build DOM through the API, never by parsing HTML strings.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Build DOM with createDiv/createEl instead of innerHTML.' },
        { property: 'outerHTML', message: 'Build DOM with createDiv/createEl instead of outerHTML.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: 'Build DOM with createDiv/createEl instead of insertAdjacentHTML.',
        },
        {
          // Guideline: reach the app through `this.app`, never the global.
          selector: "MemberExpression[object.name='window'][property.name='app']",
          message: 'Use this.app, never the global app object.',
        },
      ],

      // Guideline: no console noise by default. utils/log.ts is the one gate.
      'no-console': ['error', { allow: ['error', 'warn'] }],

      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    // The single sanctioned console.log site.
    files: ['src/utils/log.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  }
);
