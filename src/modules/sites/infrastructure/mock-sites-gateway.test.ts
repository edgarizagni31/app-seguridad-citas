import { DEV_QR_PUBLIC_KEY_HEX } from '@/shared/infrastructure/demo';
import { createFixedClock } from '@/test/fakes/fixed-clock';

import { createMockShiftGateway, createMockSitesGateway } from './mock-sites-gateway';

const SITE = { id: '29586cdd-b6a7-4d17-b790-e1281173780c', name: 'Ransa San Agustin' };

const options = (online = true) => ({ isOnline: async () => online, latencyMs: 0 });
const shiftGateway = (online = true) =>
  createMockShiftGateway({
    ...options(online),
    clock: createFixedClock('2026-10-12T16:00:00.000Z'),
  });

describe('createMockSitesGateway', () => {
  it('lista las sedes del modo demo', async () => {
    const result = await createMockSitesGateway(options()).listMySites();

    expect(result.ok && result.value.map((site) => site.name)).toEqual([
      'Sede demo 1',
      'Sede demo 2',
    ]);
  });

  it('sin red falla con network', async () => {
    expect(await createMockSitesGateway(options(false)).listMySites()).toEqual({
      ok: false,
      error: { type: 'network' },
    });
  });
});

describe('createMockShiftGateway', () => {
  it('arma el paquete del día de ejemplo para cualquier sede, con la clave del QR', async () => {
    const result = await shiftGateway().downloadSnapshot(SITE, '2026-10-12');
    if (!result.ok) throw new Error('se esperaba el paquete');

    expect(result.value.siteId).toBe(SITE.id);
    expect(result.value.appointments.map((appointment) => appointment.clientName)).toEqual([
      'DELOSI',
      'DOLLAR CITY',
      'PRICESMART',
    ]);
    expect(result.value.qrPublicKey).toBe(DEV_QR_PUBLIC_KEY_HEX);
    expect(result.value.blacklist).toHaveLength(1);
  });

  it('sin red falla con network', async () => {
    expect(await shiftGateway(false).downloadSnapshot(SITE, '2026-10-12')).toEqual({
      ok: false,
      error: { type: 'network' },
    });
  });
});
