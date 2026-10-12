import type { ReactNode } from 'react';

import { canUseApp } from '../../domain';
import { AccessDeniedScreen } from '../screens/access-denied-screen';
import { useSessionStore } from '../stores/session-store';

type RoleGateProps = { children: ReactNode };

export function RoleGate({ children }: RoleGateProps) {
  const user = useSessionStore((state) => state.session?.user);
  if (!user || !canUseApp(user)) return <AccessDeniedScreen />;
  return children;
}
