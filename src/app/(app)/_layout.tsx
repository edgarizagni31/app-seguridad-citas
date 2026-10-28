import { Stack } from 'expo-router';

import { RoleGate, useIsSupport } from '@/modules/auth';
import { ShiftGate } from '@/modules/sites';

import { NotificationsBridge } from '@/core/composition';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/composition';

export default function AppLayout() {
  const isSupport = useIsSupport();

  return (
    <RoleGate>
      <ShiftGate>
        <NotificationsBridge />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="attention" />
          <Stack.Screen name="gate/mode" />
          <Stack.Screen name="gate/units" />
          <Stack.Screen name="gate/unit/[unitId]" />
          <Stack.Screen name="gate/visitors" />
          <Stack.Screen name="gate/people" />
          <Stack.Screen name="gate/person/[personId]" />
          <Stack.Screen name="gate/confirmed" options={{ gestureEnabled: false }} />
          <Stack.Protected guard={isSupport}>
            <Stack.Screen name="support/index" />
            <Stack.Screen name="support/database" />
            <Stack.Screen name="support/table/[name]" />
          </Stack.Protected>
          <Stack.Screen name="entry/visitors" />
          <Stack.Screen
            name="entry/add-visitor"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="entry/confirmed" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="inspections/scan"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="inspections/appointment/[appointmentId]" />
          <Stack.Screen name="inspection/[vehicleId]" />
          <Stack.Screen
            name="inspection/wizard/[inspectionId]"
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="inspection/camera"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen
            name="inspection/result/[inspectionId]"
            options={{ gestureEnabled: false }}
          />
        </Stack>
      </ShiftGate>
    </RoleGate>
  );
}
