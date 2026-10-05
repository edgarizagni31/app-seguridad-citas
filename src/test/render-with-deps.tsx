import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { DependenciesProvider, type Dependencies } from '@/core/di';

import { createTestDependencies } from './fakes/test-dependencies';

export async function renderWithDeps(ui: ReactElement, overrides: Partial<Dependencies> = {}) {
  const dependencies = createTestDependencies(overrides);
  const result = await render(
    <DependenciesProvider value={dependencies}>{ui}</DependenciesProvider>,
  );
  return { ...result, dependencies };
}
