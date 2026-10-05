const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const boundaries = require('eslint-plugin-boundaries');
const testingLibrary = require('eslint-plugin-testing-library');
const globals = require('globals');

const SAME_MODULE = { module: '{{ from.element.captured.module }}' };
const UI_RUNTIME = [
  'react',
  'react-*',
  'react-native',
  'react-native-*',
  'expo',
  'expo-*',
  '@expo/*',
  'zustand',
  'zustand/*',
  '@tanstack/*',
];

const el = (types, captured) => ({
  element: { types: [].concat(types), ...(captured && { captured }) },
});
const canImport = (from, to) => ({ from: el(from), allow: { to } });

const ANYTHING = [
  { element: { type: '*' } },
  { module: { origin: ['external', 'core', 'local'] } },
];

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'docs/*', 'android/*', 'ios/*']),
  expoConfig,
  {
    files: ['*.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'import/no-cycle': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', partialMatch: false },
        { type: 'core-di', pattern: 'src/core/di', partialMatch: false },
        { type: 'core', pattern: 'src/core', partialMatch: false },
        {
          type: 'domain',
          pattern: 'src/modules/*/domain',
          capture: ['module'],
          partialMatch: false,
        },
        {
          type: 'application',
          pattern: 'src/modules/*/application',
          capture: ['module'],
          partialMatch: false,
        },
        {
          type: 'infrastructure',
          pattern: 'src/modules/*/infrastructure',
          capture: ['module'],
          partialMatch: false,
        },
        {
          type: 'presentation',
          pattern: 'src/modules/*/presentation',
          capture: ['module'],
          partialMatch: false,
        },
        { type: 'module', pattern: 'src/modules/*', capture: ['module'], partialMatch: false },
        { type: 'shared-domain', pattern: 'src/shared/domain', partialMatch: false },
        { type: 'shared-lib', pattern: 'src/shared/lib', partialMatch: false },
        {
          type: 'shared-infrastructure',
          pattern: 'src/shared/infrastructure',
          partialMatch: false,
        },
        { type: 'shared-ui', pattern: 'src/shared/ui', partialMatch: false },
        { type: 'test', pattern: 'src/test', partialMatch: false },
      ],
      'boundaries/files': [{ category: 'test', pattern: '**/*.test.{ts,tsx}' }],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            { from: { file: { categories: 'test' } }, allow: { to: ANYTHING } },
            canImport('test', ANYTHING),
            canImport('app', [el(['app', 'module', 'core', 'shared-ui', 'shared-lib'])]),
            canImport('core', [
              el(['core', 'core-di', 'module', 'domain', 'application', 'infrastructure']),
              el(['shared-domain', 'shared-lib', 'shared-infrastructure', 'shared-ui']),
            ]),
            canImport('core-di', [el(['core-di', 'domain', 'shared-domain'])]),
            canImport('module', [el(['domain', 'application', 'presentation'], SAME_MODULE)]),
            canImport('domain', [el('domain', SAME_MODULE), el(['shared-domain', 'shared-lib'])]),
            canImport('application', [
              el(['application', 'domain'], SAME_MODULE),
              el(['shared-domain', 'shared-lib']),
            ]),
            canImport('infrastructure', [
              el(['infrastructure', 'domain'], SAME_MODULE),
              el(['shared-domain', 'shared-lib', 'shared-infrastructure']),
            ]),
            canImport('presentation', [
              el(['presentation', 'application', 'domain'], SAME_MODULE),
              el(['module', 'core-di', 'shared-domain', 'shared-lib', 'shared-ui']),
            ]),
            canImport('shared-domain', [el(['shared-domain', 'shared-lib'])]),
            canImport('shared-lib', [el('shared-lib')]),
            canImport('shared-infrastructure', [
              el(['shared-infrastructure', 'shared-domain', 'shared-lib']),
            ]),
            canImport('shared-ui', [el(['shared-ui', 'shared-domain', 'shared-lib'])]),
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/modules/*/domain/**',
      'src/modules/*/application/**',
      'src/shared/domain/**',
      'src/shared/lib/**',
    ],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: UI_RUNTIME, message: 'Capa de TS puro: sin React, React Native ni Expo.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
    settings: { 'testing-library/utils-module': '@testing-library/react-native' },
  },
  prettierConfig,
]);
