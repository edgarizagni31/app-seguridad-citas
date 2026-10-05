import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DependenciesProvider, type Dependencies } from '@/core/di';

import { createTestDependencies } from './fakes/test-dependencies';

const TEST_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export async function renderWithDeps(ui: ReactElement, overrides: Partial<Dependencies> = {}) {
  const dependencies = createTestDependencies(overrides);
  const result = await render(
    <SafeAreaProvider initialMetrics={TEST_METRICS}>
      <DependenciesProvider value={dependencies}>{ui}</DependenciesProvider>
    </SafeAreaProvider>,
  );
  return { ...result, dependencies };
}
