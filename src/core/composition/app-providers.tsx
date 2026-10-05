import { useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DependenciesProvider } from '@/core/di';
import { loadEnv } from '@/shared/infrastructure';

import { createContainer } from './container';
import { installGlobalErrorHandler } from './global-error-handler';

type AppProvidersProps = { children: ReactNode };

function bootstrap() {
  const container = createContainer(loadEnv());
  installGlobalErrorHandler(container.logger);
  return container;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [container] = useState(bootstrap);

  return (
    <SafeAreaProvider>
      <DependenciesProvider value={container}>{children}</DependenciesProvider>
    </SafeAreaProvider>
  );
}
