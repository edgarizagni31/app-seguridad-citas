import type {
  EntryDraft,
  UnitValidation,
  VehicleEntryRecord,
} from '@/modules/access-control/domain';

export const buildEntryDraft = (overrides: Partial<EntryDraft> = {}): EntryDraft => ({
  mode: 'entry',
  appointmentId: 'apt-delosi',
  voucherId: 'voucher-093',
  voucherCode: 'APPASP0000000000000093',
  clientName: 'DELOSI',
  carrierName: 'Transportes Cuscatlán',
  windowStart: '2026-10-05T16:00:00.000Z',
  windowEnd: '2026-10-05T18:00:00.000Z',
  vehicleId: 'veh-abc-123',
  plate: 'ABC-123',
  visitors: [
    {
      id: 'vis-luis',
      name: 'Luis Hernández',
      documentType: 'DUI',
      documentNumber: '04512378-9',
      role: 'DRIVER',
      status: 'arrived',
      added: false,
      enteredAt: null,
      blockedReason: null,
    },
    {
      id: 'vis-pedro',
      name: 'Pedro Aguilar',
      documentType: 'DUI',
      documentNumber: '01987654-3',
      role: 'HELPER',
      status: 'not_arrived',
      added: false,
      enteredAt: null,
      blockedReason: null,
    },
  ],
  ...overrides,
});

export const buildEntryRecord = (
  overrides: Partial<VehicleEntryRecord> = {},
): VehicleEntryRecord => {
  const draft = buildEntryDraft();
  return {
    id: 'entry-1',
    mode: draft.mode,
    appointmentId: draft.appointmentId,
    voucherId: draft.voucherId,
    vehicleId: draft.vehicleId,
    plate: draft.plate,
    carrierName: draft.carrierName,
    confirmedAt: '2026-10-05T16:44:00.000Z',
    visitors: draft.visitors,
    ...overrides,
  };
};

const LUIS = {
  id: 'vis-luis',
  name: 'Luis Hernández',
  documentType: 'DUI',
  documentNumber: '04512378-9',
  role: 'DRIVER',
} as const;
const MARIO = {
  ...LUIS,
  id: 'vis-mario',
  name: 'Mario Rivas',
  documentNumber: '05873214-2',
  role: 'HELPER',
} as const;
const PEDRO = {
  ...LUIS,
  id: 'vis-pedro',
  name: 'Pedro Aguilar',
  documentNumber: '01987654-3',
  role: 'HELPER',
} as const;

export const buildUnitValidation = (overrides: Partial<UnitValidation> = {}): UnitValidation => {
  const visitors = [LUIS, MARIO, PEDRO];
  return {
    mode: 'entry',
    checkedBy: 'server',
    pendingVisitors: visitors,
    appointment: {
      id: 'apt-delosi',
      voucherId: 'voucher-093',
      voucherCode: 'APPASP0000000000000093',
      clientName: 'DELOSI',
      carrierName: 'Transportes Cuscatlán',
      windowStart: '2026-10-05T16:00:00.000Z',
      windowEnd: '2026-10-05T18:00:00.000Z',
      entryToleranceMinutes: 30,
      active: true,
      vehicles: [],
    },
    vehicle: {
      id: 'veh-abc-123',
      plate: 'ABC-123',
      enteredAt: null,
      inspectionStatus: 'pending',
      expectedVisitors: visitors,
      enteredVisitorIds: [],
    },
    qr: {
      tokenId: 'qr-1',
      siteId: 'site-central',
      appointmentId: 'apt-delosi',
      voucherId: 'voucher-093',
      voucherCode: 'APPASP0000000000000093',
      plate: 'ABC-123',
      issuedAt: new Date('2026-10-05T10:00:00Z'),
      expiresAt: new Date('2026-10-06T10:00:00Z'),
      notBefore: null,
      visitors,
    },
    ...overrides,
  };
};
