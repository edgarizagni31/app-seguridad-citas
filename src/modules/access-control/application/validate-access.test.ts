import type { AccessValidationGateway, ServerVerdict } from '../domain';
import { es256VehicleQrVerifier } from '../infrastructure';
import { err, ok, type ShiftSnapshot } from '@/shared/domain';
import { buildDemoSnapshot, signVehicleQr } from '@/shared/infrastructure/demo';
import { buildVehicleQrClaims } from '@/test/factories/vehicle-qr';
import { createFixedClock } from '@/test/fakes/fixed-clock';

import { validateUnit, validateVisitor } from './validate-access';

const NOW = new Date('2026-10-05T16:42:00Z');
const SNAPSHOT = buildDemoSnapshot('site-central', 'Almacén Central', '2026-10-05', NOW);

function setup({
  snapshot = SNAPSHOT as ShiftSnapshot | null,
  online = true,
  verdict = ok<ServerVerdict>({ type: 'accepted' }) as Awaited<
    ReturnType<AccessValidationGateway['validateUnit']>
  >,
} = {}) {
  const gateway = {
    validateUnit: jest.fn(async () => verdict),
    validateVisitor: jest.fn(async () => verdict),
  };
  const deps = {
    shift: { current: async () => snapshot },
    verifier: es256VehicleQrVerifier,
    gateway,
    isOnline: async () => online,
    clock: createFixedClock(NOW.toISOString()),
  };
  return { gateway, validateUnit: validateUnit(deps), validateVisitor: validateVisitor(deps) };
}

const token = (overrides = {}) => signVehicleQr(buildVehicleQrClaims(overrides));

describe('validateUnit', () => {
  it('con red: QR válido, reglas locales y servidor de acuerdo', async () => {
    const { validateUnit, gateway } = setup();

    const result = await validateUnit(token());

    expect(gateway.validateUnit).toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      value: { mode: 'entry', checkedBy: 'server', vehicle: { plate: 'ABC-123' } },
    });
    expect(result.ok && result.value.pendingVisitors).toHaveLength(3);
  });

  it('sin red decide con el paquete del día', async () => {
    const { validateUnit, gateway } = setup({ online: false });

    expect(await validateUnit(token())).toMatchObject({ ok: true, value: { checkedBy: 'local' } });
    expect(gateway.validateUnit).not.toHaveBeenCalled();
  });

  it('si el servidor no responde, vale la validación local', async () => {
    const { validateUnit } = setup({ verdict: err({ type: 'network' }) });

    expect(await validateUnit(token())).toMatchObject({ ok: true, value: { checkedBy: 'local' } });
  });

  it('el servidor tiene la última palabra para rechazar', async () => {
    const { validateUnit } = setup({
      verdict: ok({
        type: 'rejected',
        reason: 'VoucherNotEligible',
        message: 'No admite ingresos.',
      }),
    });

    expect(await validateUnit(token())).toEqual(
      err({ type: 'server', reason: 'VoucherNotEligible', message: 'No admite ingresos.' }),
    );
  });

  it('sin paquete del día no se puede validar', async () => {
    const { validateUnit } = setup({ snapshot: null });

    expect(await validateUnit(token())).toEqual(err({ type: 'no-shift' }));
  });

  it('un QR de otra sede, vencido o falso nunca llega al servidor', async () => {
    const { validateUnit, gateway } = setup();
    const expired = Math.floor(NOW.getTime() / 1000) - 3600;

    expect(await validateUnit(token({ sid: 'site-norte' }))).toEqual(
      err({ type: 'qr', error: { type: 'OtherSite' } }),
    );
    expect(await validateUnit(token({ exp: expired }))).toEqual(
      err({ type: 'qr', error: { type: 'Expired' } }),
    );
    expect(await validateUnit(`${token()}x`)).toEqual(
      err({ type: 'qr', error: { type: 'InvalidSignature' } }),
    );
    expect(gateway.validateUnit).not.toHaveBeenCalled();
  });

  it('una unidad que ya ingresó se rechaza con el motivo local', async () => {
    const { validateUnit } = setup();
    const entered = token({
      plt: 'XYZ-789',
      vis: [{ id: 'vis-ana', n: 'Ana Castillo', dt: 'DUI', dn: '03456789-1', r: 'DRIVER' }],
    });

    expect(await validateUnit(entered)).toMatchObject(
      err({ type: 'unit', rejection: { type: 'AlreadyEntered', plate: 'XYZ-789' } }),
    );
  });
});

describe('validateVisitor', () => {
  const visitor = { voucherId: 'voucher-093', documentType: 'DUI' as const };

  it('un documento con formato inválido se rechaza sin consultar', async () => {
    const { validateVisitor, gateway } = setup();

    expect(await validateVisitor({ ...visitor, documentNumber: '123' })).toEqual(
      err({ type: 'invalid-document' }),
    );
    expect(gateway.validateVisitor).not.toHaveBeenCalled();
  });

  it('la lista negra del paquete bloquea incluso sin red', async () => {
    const { validateVisitor } = setup({ online: false });

    expect(await validateVisitor({ ...visitor, documentNumber: '09876543-2' })).toEqual(
      err({ type: 'blacklisted', message: null }),
    );
  });

  it('con red, el servidor puede bloquear a alguien que el paquete aún no tiene', async () => {
    const { validateVisitor } = setup({
      verdict: ok({ type: 'rejected', reason: 'VisitorBlacklisted', message: 'En lista negra.' }),
    });

    expect(await validateVisitor({ ...visitor, documentNumber: '07777777-7' })).toEqual(
      err({ type: 'blacklisted', message: 'En lista negra.' }),
    );
  });

  it('sin red y fuera de la lista, se acepta con validación local', async () => {
    const { validateVisitor } = setup({ online: false });

    expect(await validateVisitor({ ...visitor, documentNumber: '04512378-9' })).toEqual(
      ok({ checkedBy: 'local' }),
    );
  });
});
