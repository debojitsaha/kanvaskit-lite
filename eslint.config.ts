import js from '@eslint/js';
import type { ESLint, Linter } from 'eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const RELATIVE_IMPORT_PATTERN = {
  group: ['./*', '../*'],
  message: 'Use the @/ alias. Relative imports are not allowed.',
};

const relativeImportRestriction: Linter.RuleEntry = [
  'error',
  { patterns: [RELATIVE_IMPORT_PATTERN] },
];

export default defineConfig(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'blob-report',
      'node_modules',
      'pnpm-lock.yaml',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        // Config files live in tsconfig.node.json; src and tests live in tsconfig.json.
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },

  // Browser code: src and tests. Relative imports banned here.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': relativeImportRestriction,
    },
  },

  // Node code: config files and scripts. Relative imports allowed.
  {
    files: ['**/*.config.ts', 'scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // React rules for components.
  {
    files: ['src/**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks as unknown as ESLint.Plugin,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Layer boundaries for src.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core/**' },
        { type: 'plugins', pattern: 'src/plugins/**' },
        { type: 'pro', pattern: 'src/pro/**' },
        { type: 'react', pattern: 'src/react/**' },
        { type: 'app', pattern: 'src/app/**' },
        { type: 'constants', pattern: 'src/constants/**' },
        { type: 'entry', pattern: 'src/main*', partialMatch: false },
      ],
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { types: ['core', 'constants'] } } },
            },
            {
              from: { element: { type: 'plugins' } },
              allow: {
                to: { element: { types: ['core', 'plugins', 'constants'] } },
              },
            },
            {
              from: { element: { type: 'pro' } },
              allow: {
                to: { element: { types: ['core', 'plugins', 'pro', 'constants'] } },
              },
            },
            {
              from: { element: { type: 'react' } },
              allow: { to: { element: { types: ['core', 'react', 'constants'] } } },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: ['app', 'react', 'core', 'plugins', 'pro', 'constants'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'entry' } },
              allow: { to: { element: { types: ['app'] } } },
            },
            {
              from: { element: { type: 'constants' } },
              allow: { to: { element: { types: ['constants'] } } },
            },
          ],
        },
      ],
    },
  },

  // Package restrictions by layer. These blocks replace the relative-import
  // restriction for their folders, so it is repeated here.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            RELATIVE_IMPORT_PATTERN,
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'core must stay framework-agnostic',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/react/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            RELATIVE_IMPORT_PATTERN,
            {
              group: ['fabric', 'fabric/*'],
              message: 'Only core, plugins and pro may import fabric',
            },
          ],
        },
      ],
    },
  },
);
