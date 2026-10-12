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
          <Stack.Screen name="entry/visitors" />
          <Stack.Screen
            name="entry/add-visitor"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="entry/confirmed" options={{ gestureEnabled: false }} />
          <Stack.Screen name="inspection/[vehicleId]" />
        </Stack>
      </ShiftGate>
    </RoleGate>
  );
}
