module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**', '!src/test/**', '!**/index.ts'],
  coverageThreshold: {
    './src/modules/*/domain/': { lines: 90, branches: 90 },
    './src/modules/*/application/': { lines: 90, branches: 90 },
  },
};
