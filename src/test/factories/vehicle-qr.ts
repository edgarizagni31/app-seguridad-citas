import type { VehicleQrClaims } from '@/shared/infrastructure/demo';

const NOW_SECONDS = Date.parse('2026-10-05T16:42:00Z') / 1000;

export const buildVehicleQrClaims = (
  overrides: Partial<VehicleQrClaims> = {},
): VehicleQrClaims => ({
  jti: 'qr-0001',
  sid: 'site-central',
  apt: 'apt-delosi',
  vch: 'voucher-093',
  vcd: 'APPASP0000000000000093',
  plt: 'ABC-123',
  iat: NOW_SECONDS - 3600,
  exp: NOW_SECONDS + 24 * 3600,
  vis: [
    { id: 'vis-luis', n: 'Luis Hernández', dt: 'DUI', dn: '04512378-9', r: 'DRIVER' },
    { id: 'vis-mario', n: 'Mario Rivas', dt: 'DUI', dn: '05873214-2', r: 'HELPER' },
    { id: 'vis-pedro', n: 'Pedro Aguilar', dt: 'DUI', dn: '01987654-3', r: 'HELPER' },
  ],
  ...overrides,
});
