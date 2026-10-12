import type { AccessValidationGateway, ServerVerdict } from '../domain';
import { es256VehicleQrVerifier } from '../infrastructure';
import { err, ok, type LocalEntry, type ShiftSnapshot } from '@/shared/domain';
import { buildDemoSnapshot, signVehicleQr } from '@/shared/infrastructure/demo';
import { buildVehicleQrClaims } from '@/test/factories/vehicle-qr';
import { createFixedClock } from '@/test/fakes/fixed-clock';

import { identifyVehicle, validateUnit, validateVisitor } from './validate-access';

const NOW = new Date('2026-10-05T16:42:00Z');
const SNAPSHOT = buildDemoSnapshot('site-central', 'Almacén Central', '2026-10-05', NOW);

function setup({
  snapshot = SNAPSHOT as ShiftSnapshot | null,
  online = true,
  localEntries = [] as LocalEntry[],
  verdict = ok<ServerVerdict>({ type: 'accepted' }) as Awaited<
    ReturnType<AccessValidationGateway['validateUnit']>
  >,
} = {}) {
  const gateway = {
    validateUnit: jest.fn(async () => verdict),
    validateVisitor: jest.fn(async () => verdict),
    confirmEntry: jest.fn(async () => verdict),
  };
  const deps = {
    shift: { current: async () => snapshot },
    entries: { tables: [], list: async () => localEntries },
    verifier: es256VehicleQrVerifier,
    gateway,
    isOnline: async () => online,
    clock: createFixedClock(NOW.toISOString()),
  };
  return {
    gateway,
    validateUnit: validateUnit(deps),
    validateVisitor: validateVisitor(deps),
    identifyVehicle: identifyVehicle(deps),
  };
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

describe('validateUnit · ingresos confirmados sin red', () => {
  const entered = (visitorIds: string[]): LocalEntry => ({
    vehicleId: 'veh-abc-123',
    enteredAt: '2026-10-05T16:40:00.000Z',
    visitorIds,
  });

  it('una unidad ingresada en este dispositivo no vuelve a ingresar', async () => {
    const { validateUnit } = setup({
      localEntries: [entered(['vis-luis', 'vis-mario', 'vis-pedro'])],
    });

    expect(await validateUnit(token())).toMatchObject(
      err({ type: 'unit', rejection: { type: 'AlreadyEntered', plate: 'ABC-123' } }),
    );
  });

  it('si faltó alguien, el re-escaneo abre la llegada tardía', async () => {
    const { validateUnit } = setup({ localEntries: [entered(['vis-luis', 'vis-mario'])] });

    const result = await validateUnit(token());

    expect(result).toMatchObject({ ok: true, value: { mode: 'late-arrival' } });
    expect(result.ok && result.value.pendingVisitors.map((visitor) => visitor.id)).toEqual([
      'vis-pedro',
    ]);
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

describe('identifyVehicle', () => {
  it('identifica una unidad que ya ingresó sin aplicar reglas de ingreso', async () => {
    const { identifyVehicle, gateway } = setup();
    const entered = token({ apt: 'apt-dollarcity', plt: 'MNP-456', vcd: 'APPASP0000000000000094' });

    expect(await identifyVehicle(entered)).toEqual(
      ok({ vehicleId: 'veh-mnp-456', plate: 'MNP-456', entered: true }),
    );
    expect(gateway.validateUnit).not.toHaveBeenCalled();
  });

  it('informa si la unidad todavía no ingresó', async () => {
    const { identifyVehicle } = setup();

    expect(await identifyVehicle(token())).toEqual(
      ok({ vehicleId: 'veh-abc-123', plate: 'ABC-123', entered: false }),
    );
  });

  it('rechaza QR inválidos, de otra cita o con otra placa', async () => {
    const { identifyVehicle } = setup();

    expect(await identifyVehicle(token({ sid: 'site-norte' }))).toEqual(
      err({ type: 'qr', error: { type: 'OtherSite' } }),
    );
    expect(await identifyVehicle(token({ apt: 'otra' }))).toMatchObject(
      err({ type: 'unit', rejection: { type: 'VoucherNotFound' } }),
    );
    expect(await identifyVehicle(token({ plt: 'ZZZ-999' }))).toMatchObject(
      err({ type: 'unit', rejection: { type: 'PlateNotInVoucher', plate: 'ZZZ-999' } }),
    );
    expect(await setup({ snapshot: null }).identifyVehicle(token())).toEqual(
      err({ type: 'no-shift' }),
    );
  });
});
