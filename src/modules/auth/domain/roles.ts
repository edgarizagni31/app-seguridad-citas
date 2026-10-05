import type { SessionUser } from './session';

// Grupos de Cognito (R360) con acceso al control de garita
export const SECURITY_ROLES = [
  'PACCESO_ADMIN',
  'PACCESO_JSEGURIDAD',
  'PACCESO_ASEGURIDAD',
  'PACCESO_SEGURIDADA',
  'PACCESO_SEGURIDADO',
  'PACCESO_SEGOPE',
] as const;

export const canAccessGate = (user: Pick<SessionUser, 'roles'>) =>
  user.roles.some((role) => (SECURITY_ROLES as readonly string[]).includes(role));
