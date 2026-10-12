import { err } from '@/shared/domain';
import type { ShiftAppointment, ShiftVehicle, ShiftVisitor } from '@/shared/domain';

import { admitUnit, entryWindow } from './unit-entry-policy';

const NOW = new Date('2026-10-05T16:00:00Z');
const minutes = (value: number) => new Date(NOW.getTime() + value * 60_000).toISOString();

const LUIS: ShiftVisitor = {
  id: 'vis-luis',
  name: 'Luis Hernández',
  documentType: 'DUI',
  documentNumber: '04512378-9',
  role: 'DRIVER',
};
const MARIO: ShiftVisitor = { ...LUIS, id: 'vis-mario', name: 'Mario Rivas', role: 'HELPER' };

const vehicle = (overrides: Partial<ShiftVehicle> = {}): ShiftVehicle => ({
  id: 'veh-1',
  plate: 'ABC-123',
  enteredAt: null,
  inspectionStatus: 'pending',
  expectedVisitors: [LUIS, MARIO],
  enteredVisitorIds: [],
  ...overrides,
});

const appointment = (overrides: Partial<ShiftAppointment> = {}): ShiftAppointment => ({
  id: 'apt-1',
  voucherId: 'voucher-1',
  voucherCode: 'APPASP0001',
  clientName: 'DELOSI',
  carrierName: 'Transportes',
  windowStart: minutes(-10),
  windowEnd: minutes(90),
  entryToleranceMinutes: 30,
  active: true,
  vehicles: [vehicle()],
  ...overrides,
});

const QR = {
  appointmentId: 'apt-1',
  voucherCode: 'APPASP0001',
  plate: 'abc 123',
  visitors: [LUIS, MARIO],
};

const admit = (apt: ShiftAppointment, now = NOW, qr = QR) =>
  admitUnit({ appointments: [apt] }, qr, now);

describe('admitUnit', () => {
  it('admite la unidad dentro de la ventana con todos sus visitantes pendientes', () => {
    const result = admit(appointment());

    expect(result).toMatchObject({ ok: true, value: { mode: 'entry' } });
    expect(result.ok && result.value.pendingVisitors).toEqual([LUIS, MARIO]);
  });

  it('un voucher que no está en el paquete del día', () => {
    expect(admit(appointment({ id: 'otra' }))).toEqual(
      err({ type: 'VoucherNotFound', voucherCode: 'APPASP0001' }),
    );
  });

  it('una placa que no pertenece al voucher', () => {
    expect(admit(appointment(), NOW, { ...QR, plate: 'ZZZ-999' })).toEqual(
      err({ type: 'PlateNotInVoucher', plate: 'ZZZ-999', voucherCode: 'APPASP0001' }),
    );
  });

  it('un voucher inactivo', () => {
    expect(admit(appointment({ active: false }))).toEqual(
      err({ type: 'VoucherInactive', voucherCode: 'APPASP0001' }),
    );
  });

  it('antes de la hora de inicio o pasada la tolerancia está fuera de ventana', () => {
    const early = admit(appointment({ windowStart: minutes(5) }));
    const late = admit(appointment({ windowStart: minutes(-31) }));

    expect(early).toMatchObject(err({ type: 'OutsideEntryWindow' }));
    expect(late).toMatchObject(
      err({ type: 'OutsideEntryWindow', opensAt: minutes(-31), closesAt: minutes(-1) }),
    );
  });

  it('si el voucher ya tiene ingresos, solo se exige no pasar la hora fin', () => {
    const started = appointment({
      windowStart: minutes(-120),
      windowEnd: minutes(10),
      vehicles: [vehicle(), vehicle({ id: 'veh-2', plate: 'XYZ-789', enteredAt: minutes(-60) })],
    });

    expect(admit(started)).toMatchObject({ ok: true, value: { mode: 'entry' } });
    expect(admit(started, new Date(minutes(11)))).toMatchObject(
      err({ type: 'OutsideEntryWindow', closesAt: minutes(10) }),
    );
  });

  it('una unidad que ya ingresó con todos sus visitantes', () => {
    const entered = vehicle({
      enteredAt: minutes(-5),
      enteredVisitorIds: ['vis-luis', 'vis-mario'],
    });

    expect(admit(appointment({ vehicles: [entered] }))).toEqual(
      err({ type: 'AlreadyEntered', plate: 'ABC-123', enteredAt: minutes(-5) }),
    );
  });

  it('si ya ingresó pero faltan visitantes, es una llegada tardía sin ventana', () => {
    const entered = vehicle({ enteredAt: minutes(-200), enteredVisitorIds: ['vis-luis'] });
    const expired = appointment({ windowStart: minutes(-300), vehicles: [entered], active: false });

    const result = admit(expired);

    expect(result).toMatchObject({ ok: true, value: { mode: 'late-arrival' } });
    expect(result.ok && result.value.pendingVisitors).toEqual([MARIO]);
  });
});

describe('entryWindow', () => {
  it('sin ingresos, cierra en el inicio más la tolerancia', () => {
    expect(entryWindow(appointment())).toEqual({ opensAt: minutes(-10), closesAt: minutes(20) });
  });
});
