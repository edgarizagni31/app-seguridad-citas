import type { ReactNode } from 'react';

import { canAccessGate } from '../../domain';
import { AccessDeniedScreen } from '../screens/access-denied-screen';
import { useSessionStore } from '../stores/session-store';

type RoleGateProps = { children: ReactNode };

export function RoleGate({ children }: RoleGateProps) {
  const user = useSessionStore((state) => state.session?.user);
  if (!user || !canAccessGate(user)) return <AccessDeniedScreen />;
  return children;
}
