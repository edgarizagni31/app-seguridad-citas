import { Stack } from 'expo-router';

import { RoleGate } from '@/modules/auth';
import { ShiftGate } from '@/modules/sites';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/composition';

export default function AppLayout() {
  return (
    <RoleGate>
      <ShiftGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="scanner"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </ShiftGate>
    </RoleGate>
  );
}
