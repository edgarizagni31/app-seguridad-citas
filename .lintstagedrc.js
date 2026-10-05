module.exports = {
  '*.{ts,tsx,js}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  'src/**/*.{ts,tsx}': 'jest --bail --findRelatedTests --passWithNoTests',
  '*.{json,md,yml,yaml}': 'prettier --write',
};
