import { DEV_QR_PUBLIC_KEY_HEX } from '@/shared/infrastructure/demo';
import { createFixedClock } from '@/test/fakes/fixed-clock';

import { createMockSitesGateways } from './mock-sites-gateway';

function setup(online = true) {
  return createMockSitesGateways({
    clock: createFixedClock('2026-10-12T16:00:00.000Z'),
    isOnline: async () => online,
    latencyMs: 0,
  });
}

describe('createMockSitesGateways', () => {
  it('lista las sedes de demostración', async () => {
    const result = await setup().sitesGateway.listMySites();

    expect(result.ok && result.value.map((site) => site.name)).toEqual([
      'Almacén Central',
      'Almacén Norte',
    ]);
  });

  it('entrega el paquete del día con las citas de los mockups y la clave del QR', async () => {
    const result = await setup().shiftGateway.downloadSnapshot('site-central', '2026-10-12');
    if (!result.ok) throw new Error('se esperaba el paquete');

    expect(result.value.appointments.map((appointment) => appointment.clientName)).toEqual([
      'DELOSI',
      'DOLLAR CITY',
      'PRICESMART',
    ]);
    expect(result.value.qrPublicKey).toBe(DEV_QR_PUBLIC_KEY_HEX);
    expect(result.value.blacklist).toHaveLength(1);
  });

  it('sin red falla con network', async () => {
    expect(await setup(false).shiftGateway.downloadSnapshot('site-central', '2026-10-12')).toEqual({
      ok: false,
      error: { type: 'network' },
    });
  });
});
