import type { PhotoRef } from './answers';
import type { Inspection, InspectionError } from './inspection';
import type { RecordSyncStatus, Result } from '@/shared/domain';

export const INSPECTION_OUTBOX_KIND = 'vehicle-inspection';

export type CapturedPhoto = {
  readonly uri: string;
  readonly width: number;
  readonly height: number;
};

export interface PhotoStore {
  // Comprime, guarda en documentos de la app (nunca en la galería) y calcula el hash
  save(input: {
    readonly inspectionId: string;
    readonly stepId: string;
    readonly capture: CapturedPhoto;
    readonly takenAt: Date;
  }): Promise<PhotoRef>;
  delete(photo: PhotoRef): Promise<void>;
  deleteAll(inspectionId: string): Promise<void>;
  // Captura descartada en la vista previa: no debe quedar en la caché
  discardCapture(capture: CapturedPhoto): Promise<void>;
}

export type TramaAnswer = {
  readonly questionId: string;
  readonly code: string;
  readonly status: 'PENDING' | 'ANSWERED' | 'SKIPPED';
  readonly value:
    | boolean
    | { readonly plateMatches: boolean }
    | {
        readonly photo: {
          readonly hash: string;
          readonly takenAt: string;
          readonly width: number;
          readonly height: number;
          readonly sizeKb: number;
        };
      }
    | null;
  readonly answeredAt: string | null;
};

// Cuerpo de VehicleInspection/Submit (docs/CONTRATO-API-INGRESO-INSPECCION.md)
export type SubmitInspectionRequest = {
  readonly inspectionId: string;
  readonly definitionVersion: string;
  readonly vehicleId: string;
  readonly appointmentId: string;
  readonly plate: string;
  readonly inspectorId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly result: 'COMPLETED' | 'OBSERVED';
  readonly observation: string;
  // Las respuestas con el formato de la trama (docs/PREGUNTAS-INSPECCION.md)
  readonly answers: readonly TramaAnswer[];
  // Solo para subir las fotos antes del registro; no viaja en el cuerpo
  readonly photos: readonly { readonly stepId: string; readonly photo: PhotoRef }[];
};

export type InspectionGatewayError = { readonly type: 'network' } | { readonly type: 'server' };

export type InspectionVerdict =
  | { readonly type: 'accepted' }
  | { readonly type: 'rejected'; readonly reason: string; readonly message: string };

export interface InspectionGateway {
  // Idempotente por inspectionId + stepId + hash
  uploadPhoto(input: {
    readonly inspectionId: string;
    readonly stepId: string;
    readonly photo: PhotoRef;
  }): Promise<Result<void, InspectionGatewayError>>;
  submit(
    request: Omit<SubmitInspectionRequest, 'photos'>,
    idempotencyKey: string,
  ): Promise<Result<InspectionVerdict, InspectionGatewayError>>;
}

export type StoredInspection = Inspection & {
  readonly syncStatus: RecordSyncStatus | null;
  readonly syncMessage: string | null;
  // "Subiendo fotos 4 de 7" mientras se sincroniza
  readonly uploadedPhotos: number;
};

export interface InspectionRepository {
  readonly tables: readonly string[];
  save(inspection: Inspection): Promise<void>;
  findById(id: string): Promise<StoredInspection | null>;
  findByVehicle(vehicleId: string): Promise<StoredInspection | null>;
  list(): Promise<StoredInspection[]>;
  // Guarda el cierre y su envío pendiente en una sola transacción
  saveFinished(inspection: Inspection, request: SubmitInspectionRequest): Promise<void>;
  setUploadedPhotos(id: string, count: number): Promise<void>;
  markSynced(id: string): Promise<void>;
  markRejected(id: string, message: string): Promise<void>;
  clearSynced(): Promise<void>;
  delete(id: string): Promise<void>;
}

export type Inspector = { readonly id: string; readonly name: string };

export type OpenInspectionError =
  | { readonly type: 'no-shift' }
  | { readonly type: 'vehicle-not-found' }
  // RF-F2: solo se inspeccionan vehículos con el ingreso confirmado
  | { readonly type: 'not-entered' }
  | { readonly type: 'storage' };

export type InspectionCommandError =
  | InspectionError
  | { readonly type: 'not-found' }
  | { readonly type: 'photo-failed' }
  | { readonly type: 'storage' };
