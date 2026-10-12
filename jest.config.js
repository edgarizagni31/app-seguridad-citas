module.exports = {
  preset: 'jest-expo',
  // Fuerza la implementación JS de worklets (Reanimated 4) en lugar de la nativa
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Patrón de jest-expo + @noble, que se publica solo como ESM
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@noble))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**', '!src/test/**', '!**/index.ts'],
  coverageThreshold: {
    './src/modules/*/domain/**/*.ts': { lines: 90, branches: 90 },
    './src/modules/*/application/**/*.ts': { lines: 90, branches: 90 },
  },
};
