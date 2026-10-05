import { useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DependenciesProvider } from '@/core/di';
import { loadEnv } from '@/shared/infrastructure';

import { createContainer } from './container';

type AppProvidersProps = { children: ReactNode };

export function AppProviders({ children }: AppProvidersProps) {
  const [container] = useState(() => createContainer(loadEnv()));

  return (
    <SafeAreaProvider>
      <DependenciesProvider value={container}>{children}</DependenciesProvider>
    </SafeAreaProvider>
  );
}
