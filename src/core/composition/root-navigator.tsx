import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useSessionLifecycle, useSessionStore } from '@/modules/auth';
import { useAppFonts } from '@/shared/ui';

export function RootNavigator() {
  const [fontsLoaded] = useAppFonts();
  useSessionLifecycle();
  const status = useSessionStore((state) => state.status);
  const ready = fontsLoaded && status !== 'restoring';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

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
