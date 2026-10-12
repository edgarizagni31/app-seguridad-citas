import type { EntryDraft, VehicleEntryRecord } from '@/modules/access-control/domain';

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
