import { Stack } from 'expo-router';

import { RoleGate } from '@/modules/auth';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/composition';

export default function AppLayout() {
  return (
    <RoleGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="scanner"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </RoleGate>
  );
}
