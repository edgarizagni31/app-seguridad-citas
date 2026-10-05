import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { useDependencies } from '@/core/di';
import { useSessionLifecycle, useSessionStore } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import { BrandSplash, useAppFonts } from '@/shared/ui';

// Evita un parpadeo del splash animado cuando la sesión se restaura al instante
export const MIN_SPLASH_MS = 600;

export function RootNavigator() {
  const { config, logger } = useDependencies();
  const [fontsLoaded, fontError] = useAppFonts();
  const [minElapsed, setMinElapsed] = useState(false);
  useSessionLifecycle();
  const status = useSessionStore((state) => state.status);
  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontError) logger.error('No se pudieron cargar las fuentes', { error: fontError });
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady, fontError, logger]);

  if (!fontsReady) return null;
  if (status === 'restoring' || !minElapsed) {
    return <BrandSplash version={STRINGS.app.version(config.appVersion)} />;
  }

  const authenticated = status === 'authenticated';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
