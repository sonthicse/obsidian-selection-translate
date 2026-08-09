import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

/*
 * Three layers, and the middle one is the point.
 *
 * The plugin guidelines this project is held to used to live only in the
 * hand-written rules at the bottom, which meant the checks Obsidian's own
 * automated review runs were not run here at all — and a batch of findings
 * came back from a review that `npm run lint` had passed clean.
 * `eslint-plugin-obsidianmd` is that review, so it belongs in CI.
 *
 * `recommendedTypeChecked` rather than `recommended` for the same reason:
 * no-unsafe-assignment and no-unsafe-argument are type-aware and simply are
 * not in the untyped preset, so the `any` that `Array.isArray` produces when
 * it narrows an `unknown` went unnoticed.
 */
export default tseslint.config(
  {
    ignores: ['main.js', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      // Type-aware rules need a program to ask; tsconfig.json already covers
      // both directories, so it is the one to point at.
      parserOptions: { project: './tsconfig.json', ecmaVersion: 2020, sourceType: 'module' },
    },
    rules: {
      /*
       * Guidelines the plugin above does not cover. Additions, not overlaps —
       * each one encodes a rejection reason that is otherwise only caught by a
       * human reading the diff.
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
    /*
     * The single sanctioned console.log site.
     *
     * Both spellings of the rule are switched off here — the core one and
     * obsidianmd's own — because the call behind them is gated on a setting the
     * user has to turn on to collect a bug report. Turning them off in the
     * config rather than with an inline `eslint-disable` is deliberate: Obsidian
     * rejects submissions that suppress their rules from inside the source.
     */
    files: ['src/utils/log.ts'],
    rules: { 'no-console': 'off', 'obsidianmd/rule-custom-message': 'off' },
  },
  {
    // Tests are not a plugin: they neither ship nor run inside Obsidian, so the
    // guidelines about Obsidian's own APIs do not apply to them.
    files: ['tests/**/*.ts'],
    rules: { 'obsidianmd/no-sample-code': 'off', 'obsidianmd/sample-names': 'off' },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  }
);
