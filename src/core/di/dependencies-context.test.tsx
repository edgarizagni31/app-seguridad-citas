import { renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createTestDependencies } from '@/test/fakes/test-dependencies';
import { renderWithDeps } from '@/test/render-with-deps';

import { useDependencies } from './dependencies-context';

function AppVersion() {
  return <Text>{useDependencies().config.appVersion}</Text>;
}

describe('useDependencies', () => {
  it('lee las dependencias del provider', async () => {
    await renderWithDeps(<AppVersion />, {
      config: { ...createTestDependencies().config, appVersion: '9.9.9' },
    });

    expect(screen.getByText('9.9.9')).toBeOnTheScreen();
  });

  it('falla con un mensaje claro sin provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useDependencies())).rejects.toThrow('DependenciesProvider');
  });
});
