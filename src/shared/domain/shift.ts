// Paquete del día de una sede: lo descarga sites y lo leen ingreso e inspección
export type DocumentType = 'DUI' | 'PASSPORT' | 'RESIDENT_CARD' | 'DRIVER_LICENSE';
export type VisitorRole = 'DRIVER' | 'HELPER';

export type ShiftVisitor = {
  readonly id: string;
  readonly name: string;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly role: VisitorRole;
};

export type InspectionStatus = 'pending' | 'in_progress' | 'inspected' | 'observed';

export type ShiftVehicle = {
  readonly id: string;
  readonly plate: string;
  readonly enteredAt: string | null;
  readonly inspectionStatus: InspectionStatus;
  readonly expectedVisitors: readonly ShiftVisitor[];
  readonly enteredVisitorIds: readonly string[];
};

export type ShiftAppointment = {
  readonly id: string;
  readonly voucherId: string;
  readonly voucherCode: string;
  readonly clientName: string;
  readonly carrierName: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly entryToleranceMinutes: number;
  readonly active: boolean;
  readonly vehicles: readonly ShiftVehicle[];
};

export type BlacklistEntry = {
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly reason: string;
};

export type ShiftSnapshot = {
  readonly siteId: string;
  readonly siteName: string;
  readonly date: string;
  readonly generatedAt: string;
  readonly qrPublicKey: string;
  readonly appointments: readonly ShiftAppointment[];
  readonly blacklist: readonly BlacklistEntry[];
};

// Tablas que avisan cuando cambia la sede o el paquete del día
export const SHIFT_TABLES = ['app_settings', 'shift_snapshot'] as const;

export interface ShiftReader {
  current(): Promise<ShiftSnapshot | null>;
}

export const normalizeDocument = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();
export const normalizePlate = normalizeDocument;

export const findBlacklisted = (
  snapshot: Pick<ShiftSnapshot, 'blacklist'>,
  documentType: DocumentType,
  documentNumber: string,
): BlacklistEntry | undefined =>
  snapshot.blacklist.find(
    (entry) =>
      entry.documentType === documentType &&
      normalizeDocument(entry.documentNumber) === normalizeDocument(documentNumber),
  );

export function findVehicle(snapshot: Pick<ShiftSnapshot, 'appointments'>, vehicleId: string) {
  for (const appointment of snapshot.appointments) {
    const vehicle = appointment.vehicles.find((candidate) => candidate.id === vehicleId);
    if (vehicle) return { appointment, vehicle };
  }
  return null;
}

// Ingreso confirmado en este dispositivo que el paquete del día todavía no refleja
export type LocalEntry = {
  readonly vehicleId: string;
  readonly enteredAt: string;
  readonly visitorIds: readonly string[];
};

export interface EntryLog {
  readonly tables: readonly string[];
  list(): Promise<LocalEntry[]>;
}

export function applyEntries(
  snapshot: ShiftSnapshot,
  entries: readonly LocalEntry[],
): ShiftSnapshot {
  if (entries.length === 0) return snapshot;
  return {
    ...snapshot,
    appointments: snapshot.appointments.map((appointment) => ({
      ...appointment,
      vehicles: appointment.vehicles.map((vehicle) => {
        const own = entries.filter((entry) => entry.vehicleId === vehicle.id);
        if (own.length === 0) return vehicle;
        const firstEntry = own.map((entry) => entry.enteredAt).sort()[0] ?? null;
        return {
          ...vehicle,
          enteredAt: vehicle.enteredAt ?? firstEntry,
          enteredVisitorIds: [
            ...new Set([...vehicle.enteredVisitorIds, ...own.flatMap((entry) => entry.visitorIds)]),
          ],
        };
      }),
    })),
  };
}
