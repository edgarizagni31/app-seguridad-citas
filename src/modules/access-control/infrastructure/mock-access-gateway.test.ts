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
