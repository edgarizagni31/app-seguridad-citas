import { err, ok } from '@/shared/domain';

import { checkQrValidity, type VehicleQr } from './vehicle-qr';

const QR: VehicleQr = {
  tokenId: 'qr-1',
  siteId: 'site-central',
  appointmentId: 'apt-1',
  voucherId: 'voucher-1',
  voucherCode: 'APPASP0001',
  plate: 'ABC-123',
  issuedAt: new Date('2026-10-05T10:00:00Z'),
  expiresAt: new Date('2026-10-05T18:00:00Z'),
  notBefore: new Date('2026-10-05T12:00:00Z'),
  visitors: [],
};

const check = (now: string, siteId = 'site-central') =>
  checkQrValidity(QR, { now: new Date(now), siteId });

describe('checkQrValidity', () => {
  it('un QR vigente de la sede es válido', () => {
    expect(check('2026-10-05T15:00:00Z')).toEqual(ok(QR));
  });

  it('tolera 2 minutos de desfase de reloj en ambos extremos', () => {
    expect(check('2026-10-05T18:02:00Z').ok).toBe(true);
    expect(check('2026-10-05T11:58:00Z').ok).toBe(true);
  });

  it('vencido o aún no vigente', () => {
    expect(check('2026-10-05T18:02:01Z')).toEqual(err({ type: 'Expired' }));
    expect(check('2026-10-05T11:57:59Z')).toEqual(err({ type: 'NotYetValid' }));
  });

  it('de otra sede', () => {
    expect(check('2026-10-05T15:00:00Z', 'site-norte')).toEqual(err({ type: 'OtherSite' }));
  });
});
