import { buildDemoProtocol } from './demo-protocol';
import { createMockInspectionGateway } from './mock-inspection-gateway';

const PROTOCOL = buildDemoProtocol();
const idOf = (code: string) => PROTOCOL.questions.find((q) => q.code === code)!.id;

const setup = (online = true) =>
  createMockInspectionGateway({ isOnline: async () => online, latencyMs: 0 });

describe('createMockInspectionGateway', () => {
  it('sirve el cuestionario v1 como protocolo', async () => {
    const result = await setup().getProtocol('voucher-1', 'vtu-1');

    expect(result.ok && result.value.questions).toHaveLength(15);
    expect(result.ok && result.value.responseId).toBeNull();
  });

  it('evalúa la conformidad por opción y recuerda lo enviado', async () => {
    const gateway = setup();
    const seal = idOf('has-rear-left-seal');

    const outcome = await gateway.execute(
      {
        inspectionId: 'i',
        protocolId: PROTOCOL.protocolId,
        voucherId: 'voucher-1',
        unitId: 'vtu-1',
        plate: 'ABC-123',
        observation: null,
        answers: [
          { questionId: seal, status: 'ANSWERED', optionId: `${seal}-no`, photo: null },
          {
            questionId: idOf('front-photo'),
            status: 'ANSWERED',
            optionId: null,
            photo: { id: 'p1' } as never,
          },
          { questionId: 'desconocida', status: 'ANSWERED', optionId: 'x', photo: null },
        ],
      },
      {},
    );
    const reopened = await gateway.getProtocol('voucher-1', 'vtu-1');

    expect(outcome).toEqual({
      ok: true,
      value: {
        type: 'accepted',
        compliant: false,
        nonCompliant: ['¿El vehículo cuenta con precinto trasero izquierdo?: No'],
      },
    });
    if (!reopened.ok) throw new Error('se esperaba el protocolo');
    expect(reopened.value.responseId).toBe('response-voucher-1:vtu-1');
    expect(reopened.value.questions.find((q) => q.id === seal)?.saved).toEqual({
      status: 'ANSWERED',
      optionId: `${seal}-no`,
      evidenceUrl: null,
    });
    expect(reopened.value.questions.find((q) => q.code === 'front-photo')?.saved.evidenceUrl).toBe(
      'https://demo.ransa/evidencias/p1.jpg',
    );
  });

  it('sin red falla con network', async () => {
    const gateway = setup(false);

    expect(await gateway.getProtocol('v', 'u')).toEqual({ ok: false, error: { type: 'network' } });
    expect(
      await gateway.execute(
        {
          inspectionId: 'i',
          protocolId: 'p',
          voucherId: 'v',
          unitId: 'u',
          plate: 'P',
          observation: null,
          answers: [],
        },
        {},
      ),
    ).toEqual({ ok: false, error: { type: 'network' } });
  });
});
