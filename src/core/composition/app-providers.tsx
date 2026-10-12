import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DependenciesProvider } from '@/core/di';
import { loadEnv } from '@/shared/infrastructure';

import { createContainer } from './container';
import { installGlobalErrorHandler } from './global-error-handler';

type AppProvidersProps = { children: ReactNode };

function bootstrap() {
  const container = createContainer(loadEnv());
  installGlobalErrorHandler(container.dependencies.logger);
  return container;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [container] = useState(bootstrap);

  useEffect(() => container.start(), [container]);

  return (
    <SafeAreaProvider>
      <DependenciesProvider value={container.dependencies}>{children}</DependenciesProvider>
    </SafeAreaProvider>
  );
}
