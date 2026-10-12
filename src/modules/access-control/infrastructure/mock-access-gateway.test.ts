import { err, ok } from '@/shared/domain';

import { createMockAccessGateway } from './mock-access-gateway';

const gateway = (online: boolean) =>
  createMockAccessGateway({ isOnline: async () => online, latencyMs: 0 });

describe('createMockAccessGateway', () => {
  it('sin red responde error de red', async () => {
    expect(await gateway(false).validateUnit('token')).toEqual(err({ type: 'network' }));
  });

  it('acepta unidades y visitantes comunes', async () => {
    expect(await gateway(true).validateUnit('token')).toEqual(ok({ type: 'accepted' }));
    expect(
      await gateway(true).validateVisitor({
        voucherId: 'voucher-093',
        documentType: 'DUI',
        documentNumber: '04512378-9',
      }),
    ).toEqual(ok({ type: 'accepted' }));
  });

  it('simula una lista negra más nueva que el paquete del día', async () => {
    expect(
      await gateway(true).validateVisitor({
        voucherId: 'voucher-093',
        documentType: 'DUI',
        documentNumber: '077777777',
      }),
    ).toMatchObject(ok({ type: 'rejected', reason: 'VisitorBlacklisted' }));
  });
});

describe('createMockAccessGateway · confirmEntry', () => {
  const request = {
    entryId: 'entry-1',
    appointmentId: 'apt-delosi',
    voucherId: 'voucher-093',
    vehicleId: 'veh-abc-123',
    plate: 'ABC-123',
    confirmedAt: '2026-10-05T16:44:00.000Z',
    visitors: [
      {
        visitorId: null,
        name: 'Raúl Pineda',
        documentType: 'DUI' as const,
        documentNumber: '07777777-7',
        role: 'HELPER' as const,
        status: 'ARRIVED' as const,
        added: true,
      },
    ],
  };

  it('rechaza el ingreso de alguien bloqueado en el servidor', async () => {
    expect(await gateway(true).confirmEntry(request, 'entry-1')).toMatchObject(
      ok({ type: 'rejected', reason: 'VisitorBlacklisted' }),
    );
  });

  it('es idempotente y no rechaza a quien no ingresa', async () => {
    const mock = gateway(true);
    const notArrived = {
      ...request,
      visitors: request.visitors.map((visitor) => ({
        ...visitor,
        status: 'NOT_ARRIVED' as const,
      })),
    };

    expect(await mock.confirmEntry(notArrived, 'entry-1')).toEqual(ok({ type: 'accepted' }));
    expect(await mock.confirmEntry(notArrived, 'entry-1')).toEqual(ok({ type: 'accepted' }));
  });

  it('sin red es error de red', async () => {
    expect(await gateway(false).confirmEntry(request, 'entry-1')).toEqual(err({ type: 'network' }));
  });
});
