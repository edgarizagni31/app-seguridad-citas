import type { SessionUser } from './session';

type RoleHolder = Pick<SessionUser, 'roles'>;

// Grupos de Cognito (R360) del personal de seguridad de garita
export const SECURITY_ROLES = [
  'PACCESO_ADMIN',
  'PACCESO_JSEGURIDAD',
  'PACCESO_ASEGURIDAD',
  'PACCESO_SEGURIDADA',
  'PACCESO_SEGURIDADO',
  'PACCESO_SEGOPE',
] as const;

export const HSE_ROLES = ['PACCESO_JHSE', 'PACCESO_AHSE'] as const;

// Soporte revisa y fuerza la sincronización de lo guardado en el teléfono
export const SUPPORT_ROLES = ['PACCESO_SOPORTE'] as const;

export type AppSection = 'gate' | 'inspections' | 'history' | 'profile';
export type PrimaryRole = 'security' | 'hse' | 'support';

const hasAny = (user: RoleHolder, roles: readonly string[]) =>
  user.roles.some((role) => roles.includes(role));

export const canManageEntry = (user: RoleHolder) => hasAny(user, SECURITY_ROLES);
export const isInspector = (user: RoleHolder) => hasAny(user, HSE_ROLES);
// Seguridad puede inspeccionar de forma opcional
export const canInspect = (user: RoleHolder) => isInspector(user) || canManageEntry(user);
export const isSupport = (user: RoleHolder) => hasAny(user, SUPPORT_ROLES);
// Quien solo es soporte no opera la garita: no necesita sede ni paquete del día
export const needsShift = (user: RoleHolder) => canManageEntry(user) || isInspector(user);
export const canUseApp = (user: RoleHolder) => needsShift(user) || isSupport(user);

export function sectionsFor(user: RoleHolder): AppSection[] {
  if (!canUseApp(user)) return [];
  return [
    ...(canManageEntry(user) ? (['gate'] as const) : []),
    ...(isInspector(user) ? (['inspections'] as const) : []),
    'history',
    'profile',
  ];
}

export const primaryRoleOf = (user: RoleHolder): PrimaryRole | null =>
  canManageEntry(user)
    ? 'security'
    : isInspector(user)
      ? 'hse'
      : isSupport(user)
        ? 'support'
        : null;
