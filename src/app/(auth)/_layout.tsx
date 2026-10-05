import { Stack } from 'expo-router';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/composition';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
