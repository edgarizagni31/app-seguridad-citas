import type { VehicleEntryRecord } from './vehicle-entry';
import type { DocumentType, RecordSyncStatus, VisitorRole } from '@/shared/domain';

export const ENTRY_OUTBOX_KIND = 'vehicle-entry';

// Cuerpo de ConfirmVehicleEntry (docs/CONTRATO-API-INGRESO-INSPECCION.md)
export type ConfirmEntryRequest = {
  readonly entryId: string;
  readonly appointmentId: string;
  readonly voucherId: string;
  readonly vehicleId: string;
  readonly plate: string;
  readonly confirmedAt: string;
  readonly visitors: readonly {
    readonly visitorId: string | null;
    readonly name: string;
    readonly documentType: DocumentType;
    readonly documentNumber: string;
    readonly role: VisitorRole;
    readonly status: 'ARRIVED' | 'NOT_ARRIVED';
    readonly added: boolean;
  }[];
};

export const toConfirmEntryRequest = (record: VehicleEntryRecord): ConfirmEntryRequest => ({
  entryId: record.id,
  appointmentId: record.appointmentId,
  voucherId: record.voucherId,
  vehicleId: record.vehicleId,
  plate: record.plate,
  confirmedAt: record.confirmedAt,
  visitors: record.visitors.map((visitor) => ({
    visitorId: visitor.added ? null : visitor.id,
    name: visitor.name,
    documentType: visitor.documentType,
    documentNumber: visitor.documentNumber,
    role: visitor.role,
    status: visitor.status === 'arrived' ? 'ARRIVED' : 'NOT_ARRIVED',
    added: visitor.added,
  })),
});

// Lo que queda guardado del ingreso: sin documentos, solo ids y conteos
export type StoredEntry = {
  readonly id: string;
  readonly mode: VehicleEntryRecord['mode'];
  readonly vehicleId: string;
  readonly plate: string;
  readonly carrierName: string;
  readonly confirmedAt: string;
  readonly arrivedVisitorIds: readonly string[];
  readonly entering: number;
  readonly notArriving: number;
  readonly syncStatus: RecordSyncStatus;
  readonly syncMessage: string | null;
};

export interface EntryRepository {
  readonly tables: readonly string[];
  // Guarda el ingreso y su envío pendiente en una sola transacción
  saveConfirmed(record: VehicleEntryRecord, request: ConfirmEntryRequest): Promise<void>;
  list(): Promise<StoredEntry[]>;
  markSynced(id: string): Promise<void>;
  markRejected(id: string, message: string): Promise<void>;
  clearSynced(): Promise<void>;
}
