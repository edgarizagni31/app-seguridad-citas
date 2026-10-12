import type { ShiftAppointment, ShiftSnapshot, ShiftVehicle, ShiftVisitor } from '@/shared/domain';

import { DEV_QR_PUBLIC_KEY_HEX } from './dev-qr-keys';

const MINUTE = 60_000;
const at = (now: Date, minutes: number) => new Date(now.getTime() + minutes * MINUTE).toISOString();

const visitor = (
  id: string,
  name: string,
  documentNumber: string,
  role: ShiftVisitor['role'],
): ShiftVisitor => ({ id, name, documentType: 'DUI', documentNumber, role });

const vehicle = (
  partial: Partial<ShiftVehicle> & Pick<ShiftVehicle, 'id' | 'plate'>,
): ShiftVehicle => ({
  enteredAt: null,
  inspectionStatus: 'pending',
  expectedVisitors: [],
  enteredVisitorIds: [],
  ...partial,
});

export const DEMO_VEHICLE_IDS = {
  pendingEntry: 'veh-abc-123',
  inProgress: 'veh-xyz-789',
  pendingInspection: 'veh-mnp-456',
} as const;

// Ventanas relativas a "ahora" para que la demo funcione a cualquier hora
export function buildDemoSnapshot(
  siteId: string,
  siteName: string,
  date: string,
  now: Date,
): ShiftSnapshot {
  const delosi: ShiftAppointment = {
    id: 'apt-delosi',
    voucherId: 'voucher-093',
    voucherCode: 'APPASP0000000000000093',
    clientName: 'DELOSI',
    carrierName: 'Transportes Cuscatlán',
    windowStart: at(now, -30),
    windowEnd: at(now, 60),
    entryToleranceMinutes: 30,
    active: true,
    vehicles: [
      vehicle({
        id: DEMO_VEHICLE_IDS.pendingEntry,
        plate: 'ABC-123',
        expectedVisitors: [
          visitor('vis-luis', 'Luis Hernández', '04512378-9', 'DRIVER'),
          visitor('vis-mario', 'Mario Rivas', '05873214-2', 'HELPER'),
          visitor('vis-pedro', 'Pedro Aguilar', '01987654-3', 'HELPER'),
        ],
      }),
      vehicle({
        id: DEMO_VEHICLE_IDS.inProgress,
        plate: 'XYZ-789',
        enteredAt: at(now, -20),
        inspectionStatus: 'in_progress',
        expectedVisitors: [visitor('vis-ana', 'Ana Castillo', '03456789-1', 'DRIVER')],
        enteredVisitorIds: ['vis-ana'],
      }),
    ],
  };
  const dollarCity: ShiftAppointment = {
    id: 'apt-dollarcity',
    voucherId: 'voucher-094',
    voucherCode: 'APPASP0000000000000094',
    clientName: 'DOLLAR CITY',
    carrierName: 'Logística del Pacífico',
    windowStart: at(now, -45),
    windowEnd: at(now, 75),
    entryToleranceMinutes: 30,
    active: true,
    vehicles: [
      vehicle({
        id: DEMO_VEHICLE_IDS.pendingInspection,
        plate: 'MNP-456',
        enteredAt: at(now, -35),
        expectedVisitors: [visitor('vis-jorge', 'Jorge Molina', '02345678-0', 'DRIVER')],
        enteredVisitorIds: ['vis-jorge'],
      }),
    ],
  };
  const inspectedEarlier: ShiftAppointment = {
    id: 'apt-pricesmart',
    voucherId: 'voucher-090',
    voucherCode: 'APPASP0000000000000090',
    clientName: 'PRICESMART',
    carrierName: 'Transportes Cuscatlán',
    windowStart: at(now, -240),
    windowEnd: at(now, -150),
    entryToleranceMinutes: 30,
    active: true,
    vehicles: ['JKL-101', 'JKL-102', 'JKL-103'].map((plate, index) =>
      vehicle({
        id: `veh-${plate.toLowerCase()}`,
        plate,
        enteredAt: at(now, -230 + index * 10),
        inspectionStatus: 'inspected',
      }),
    ),
  };
  return {
    siteId,
    siteName,
    date,
    generatedAt: now.toISOString(),
    qrPublicKey: DEV_QR_PUBLIC_KEY_HEX,
    appointments: [delosi, dollarCity, inspectedEarlier],
    blacklist: [
      {
        documentType: 'DUI',
        documentNumber: '09876543-2',
        reason: 'Incidente de seguridad registrado',
      },
    ],
  };
}
