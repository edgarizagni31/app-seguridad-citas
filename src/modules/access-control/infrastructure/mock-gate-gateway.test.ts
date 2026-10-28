import { createFixedClock } from '@/test/fakes/fixed-clock';

import { createMockGateGateway, DEMO_APPOINTMENT_QRS } from './mock-gate-gateway';

const setup = (online = true) =>
  createMockGateGateway({
    clock: createFixedClock('2026-10-28T15:40:00.000Z'),
    isOnline: async () => online,
    latencyMs: 0,
  });

describe('createMockGateGateway', () => {
  it('encuentra las citas de la demo y responde «no encontrada» para otro QR', async () => {
    const gateway = setup();

    const delosi = await gateway.lookup(DEMO_APPOINTMENT_QRS.delosi.toUpperCase());
    const missing = await gateway.lookup('00000000000000000000000000000000');

    expect(delosi.ok && delosi.value.found && delosi.value.appointment.clientName).toBe('DELOSI');
    expect(missing).toEqual({
      ok: true,
      value: {
        found: false,
        reason: 'VOUCHER_NOT_FOUND',
        message: 'No se encontró una cita con este QR.',
      },
    });
  });

  it('registra unidades de forma idempotente y pide el conductor si la unidad no tiene', async () => {
    const gateway = setup();

    const first = await gateway.register('v-delosi', [
      { mode: 'vehicular', unitId: 'vtu-abc', driverDocument: null },
      { mode: 'vehicular', unitId: 'vtu-lmn', driverDocument: null },
      { mode: 'vehicular', unitId: 'otra', driverDocument: null },
    ]);
    const again = await gateway.register('v-delosi', [
      { mode: 'vehicular', unitId: 'vtu-abc', driverDocument: null },
      { mode: 'vehicular', unitId: 'vtu-lmn', driverDocument: '0451-2378' },
    ]);

    expect(first.ok && first.value.map((result) => result.registered)).toEqual([
      true,
      false,
      false,
    ]);
    expect(first.ok && first.value[1]).toMatchObject({ reason: 'DRIVER_DOCUMENT_REQUIRED' });
    expect(again.ok && again.value[0]).toEqual(first.ok && first.value[0]);
    expect(again.ok && again.value[1]?.registered).toBe(true);
  });

  it('rechaza personas no habilitadas, con veto o ajenas a la cita', async () => {
    const result = await setup().register('v-delosi', [
      { mode: 'pedestrian', personId: 'vv-rosa' },
      { mode: 'pedestrian', personId: 'vv-raul' },
      { mode: 'pedestrian', personId: 'vv-ana' },
      { mode: 'pedestrian', personId: 'vv-pedro' },
    ]);

    expect(result.ok && result.value.map((item) => (item.registered ? 'ok' : item.reason))).toEqual(
      ['VISITOR_NOT_ENABLED', 'VISITOR_BLACKLISTED', 'VISITOR_NOT_IN_VOUCHER', 'ok'],
    );
  });

  it('confirma solo lo presentado y pendiente, una sola vez', async () => {
    const gateway = setup();
    const registered = await gateway.register('v-dollar', [
      { mode: 'pedestrian', personId: 'vv-ana' },
    ]);
    const accessId =
      registered.ok && registered.value[0]?.registered ? registered.value[0].personAccessId : null;
    const request = { voucherId: 'v-dollar', unitAccessIds: [], personAccessIds: [accessId!] };

    expect(await gateway.confirm(request)).toEqual({
      ok: true,
      value: {
        confirmedUnits: 0,
        confirmedVisitors: 1,
        enteredAt: '2026-10-28T15:40:00.000Z',
        message: 'Ingreso confirmado.',
      },
    });
    expect(await gateway.confirm(request)).toMatchObject({
      ok: false,
      error: { type: 'rejected' },
    });
  });

  it('una cita no vigente o fuera de ventana no se confirma', async () => {
    const gateway = setup();
    const ids = { unitAccessIds: ['x'], personAccessIds: [] };

    expect(
      await gateway.register('v-pricesmart', [{ mode: 'pedestrian', personId: 'vv-carla' }]),
    ).toMatchObject({ ok: true, value: [{ reason: 'VOUCHER_NOT_ELIGIBLE' }] });
    expect(await gateway.confirm({ voucherId: 'v-pricesmart', ...ids })).toEqual({
      ok: false,
      error: { type: 'rejected', message: 'La cita no está vigente.' },
    });
    expect(await gateway.confirm({ voucherId: 'v-inkafarma', ...ids })).toEqual({
      ok: false,
      error: { type: 'rejected', message: 'La cita está fuera de la ventana de ingreso.' },
    });
    expect(
      await gateway.register('no-existe', [{ mode: 'pedestrian', personId: 'p' }]),
    ).toMatchObject({ ok: true, value: [{ reason: 'VOUCHER_NOT_FOUND' }] });
  });

  it('sin red falla con network', async () => {
    const gateway = setup(false);

    expect(await gateway.lookup(DEMO_APPOINTMENT_QRS.delosi)).toEqual({
      ok: false,
      error: { type: 'network' },
    });
  });
});
