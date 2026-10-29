import type { PhotoRef } from './answers';
import type { Inspection, InspectionError } from './inspection';
import type { InspectionProtocol, ProtocolError } from './protocol';
import type { RecordSyncStatus, Result } from '@/shared/domain';

export const INSPECTION_OUTBOX_KIND = 'vehicle-inspection';

// Límite de ExecuteInspectionProtocol por foto
export const MAX_PHOTO_BYTES = 500 * 1024;

export type CapturedPhoto = {
  readonly uri: string;
  readonly width: number;
  readonly height: number;
};

export interface PhotoStore {
  // Comprime (máx. 500 KB), guarda en documentos de la app (nunca en la galería) y calcula el hash
  save(input: {
    readonly inspectionId: string;
    readonly stepId: string;
    readonly capture: CapturedPhoto;
    readonly takenAt: Date;
  }): Promise<PhotoRef>;
  readBase64(photo: PhotoRef): Promise<string>;
  delete(photo: PhotoRef): Promise<void>;
  deleteAll(inspectionId: string): Promise<void>;
  // Captura descartada en la vista previa: no debe quedar en la caché
  discardCapture(capture: CapturedPhoto): Promise<void>;
}

export type ExecuteAnswer = {
  readonly questionId: string;
  readonly status: 'ANSWERED' | 'SKIPPED';
  readonly optionId: string | null;
  // Se envía en base64 al sincronizar; si ya está en el servidor, solo su URL
  readonly photo: PhotoRef | null;
};

// Cuerpo de VehicleInspection/ExecuteInspectionProtocol (sin las fotos en base64)
export type ExecuteInspectionRequest = {
  readonly inspectionId: string;
  readonly protocolId: string;
  readonly voucherId: string;
  readonly unitId: string;
  // Solo para los avisos locales («Inspección ABC-123»); no viaja al servidor
  readonly plate: string;
  readonly observation: string | null;
  readonly answers: readonly ExecuteAnswer[];
};

export type InspectionVerdict = {
  readonly compliant: boolean;
  // Controles no conformes: «Pregunta: opción»
  readonly nonCompliant: readonly string[];
};

export type ExecuteOutcome =
  | ({ readonly type: 'accepted' } & InspectionVerdict)
  | { readonly type: 'rejected'; readonly message: string };

export type InspectionGatewayError =
  { readonly type: 'network' } | { readonly type: 'unauthorized' } | { readonly type: 'server' };

export interface InspectionGateway {
  getProtocol(
    voucherId: string,
    unitId: string,
  ): Promise<Result<InspectionProtocol, InspectionGatewayError>>;
  // Idempotente por voucher + unidad: el servidor reemplaza las respuestas anteriores
  execute(
    request: ExecuteInspectionRequest,
    photos: Readonly<Record<string, string>>,
  ): Promise<Result<ExecuteOutcome, InspectionGatewayError>>;
}

export type StoredInspection = Inspection & {
  readonly syncStatus: RecordSyncStatus | null;
  readonly syncMessage: string | null;
  readonly verdict: InspectionVerdict | null;
};

export interface InspectionRepository {
  readonly tables: readonly string[];
  save(inspection: Inspection): Promise<void>;
  findById(id: string): Promise<StoredInspection | null>;
  findByUnit(voucherId: string, unitId: string): Promise<StoredInspection | null>;
  list(): Promise<StoredInspection[]>;
  // Guarda el cierre y su envío pendiente en una sola transacción
  saveFinished(inspection: Inspection, request: ExecuteInspectionRequest): Promise<void>;
  markSynced(id: string, verdict: InspectionVerdict): Promise<void>;
  markRejected(id: string, message: string): Promise<void>;
  markPending(id: string): Promise<void>;
  clearSynced(): Promise<void>;
  delete(id: string): Promise<void>;
}

export type Inspector = { readonly id: string; readonly name: string };

// La unidad a inspeccionar, tal como la devuelve la garita (ValidateGatePresentation)
export type InspectionTarget = {
  readonly voucherId: string;
  readonly unitId: string;
  readonly voucherCode: string;
  readonly clientName: string;
  readonly plate: string;
};

export type OpenInspectionError =
  | ProtocolError
  | { readonly type: 'offline' }
  | InspectionGatewayError
  | { readonly type: 'storage' };

export type InspectionCommandError =
  | InspectionError
  | { readonly type: 'not-found' }
  | { readonly type: 'photo-failed' }
  | { readonly type: 'storage' };
