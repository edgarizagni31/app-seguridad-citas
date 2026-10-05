import { Stack } from 'expo-router';

import { RoleGate } from '@/modules/auth';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/composition';

export default function AppLayout() {
  return (
    <RoleGate>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGate>
  );
}
