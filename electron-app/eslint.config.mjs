import pluginN from 'eslint-plugin-n';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**/*',
      'dist-ts/**/*',
      'out/**/*',
      'node_modules/**/*',
      '*.js',
      '*.mjs',
      '.webpack/**/*',
      'forge.config.ts',
    ],
  },

  {
    files: ['src/**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      n: pluginN,
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Node.js rules
      ...pluginN.configs['recommended-script'].rules,
      'n/no-unsupported-features/es-syntax': [
        'error',
        { version: '>=18.18.2', ignores: [] },
      ],
      'n/no-unsupported-features/node-builtins': [
        'error',
        {
          version: '>=18.18.2',
          ignores: ['fetch', 'Response', 'Headers', 'Request'],
        },
      ],
      'n/no-unpublished-require': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-missing-import': 'off',

      // TypeScript rules
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
