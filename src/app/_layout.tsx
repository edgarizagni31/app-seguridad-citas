import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AppProviders, RootNavigator } from '@/core/composition';
import { ErrorFallback } from '@/shared/ui';

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ErrorFallback onRetry={() => void retry()} />;
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
