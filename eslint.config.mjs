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

      /*
       * Guideline: no console noise by default. utils/log.ts is the one gate.
       *
       * The allow list is copied from `obsidianmd/rule-custom-message`, which
       * permits exactly warn, error and debug. Matching it rather than choosing
       * our own is the point: this file used to be laxer in one direction (an
       * override switching the rule off for log.ts) and stricter in another (no
       * `debug`), which meant `npm run lint` could pass while a reviewer running
       * the plugin's own ruleset saw an error. It did — that is how this was
       * found. Keep the two lists identical.
       */
      'no-console': ['error', { allow: ['error', 'warn', 'debug'] }],

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
     * The layer boundary, enforced rather than trusted.
     *
     * src/types.ts states it as a rule the code is meant to keep: the UI never
     * learns which provider answered, and no provider ever sees a DOM node. It
     * was true when checked by hand, but nothing stopped the next import from
     * quietly making it false — and once one crosses, the rest follow, because
     * the rule stops looking real.
     *
     * Two directions, for two different reasons. Providers must not reach into
     * the DOM layers or they can no longer be tested with a fixture and a fake
     * response. The UI must not reach into providers or it starts rendering
     * one engine's shape, which is exactly what E5's three new engines would
     * then have to imitate.
     */
    files: ['src/providers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui/**', '**/selection/**', '**/core/**'],
              message:
                'Providers must not see the DOM. Return plain data from src/types.ts and let core decide what to do with it.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/providers/**'],
              message:
                'The UI must not know which engine answered. Everything it renders arrives as TranslationResult or UiErrorInfo.',
            },
          ],
        },
      ],
    },
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
