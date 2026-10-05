const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'docs/*', 'android/*', 'ios/*']),
  expoConfig,
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'import/no-cycle': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  prettierConfig,
]);
