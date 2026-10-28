import type { Result } from '@/shared/domain';

// Escala de VisitorDocumentStatus del backend, compartida por documentos de unidad y de persona
export const DOCUMENT_STATUS = {
  pending: 1,
  inReview: 2,
  valid: 3,
  rejected: 4,
  archived: 5,
  expired: 6,
} as const;

export type GateDocument = {
  readonly id: string;
  readonly name: string | null;
  readonly status: number | null;
  readonly expiresAt: string | null;
  readonly fileUrl: string | null;
};

export type GateDriver = {
  readonly personId: string;
  readonly name: string | null;
  readonly documentNumber: string | null;
};

export type GateUnit = {
  readonly id: string;
  readonly transportUnitId: string;
  readonly plate: string;
  readonly normalizedPlate: string;
  readonly driver: GateDriver | null;
  readonly documents: readonly GateDocument[];
};

export type GatePerson = {
  readonly id: string;
  readonly name: string;
  readonly documentNumber: string | null;
  readonly status: string;
  readonly enabled: boolean;
  readonly isConductor: boolean;
  readonly documents: readonly GateDocument[];
};

export type GateAppointment = {
  readonly voucherId: string;
  readonly code: string;
  readonly eligible: boolean;
  readonly message: string;
  readonly timeZoneId: string | null;
  // Ya vienen en la hora local de la sede
  readonly windowStart: string | null;
  readonly windowEnd: string | null;
  readonly withinWindow: boolean;
  readonly clientName: string | null;
  readonly supplierName: string | null;
  readonly units: readonly GateUnit[];
  readonly people: readonly GatePerson[];
};

export type GateLookup =
  | { readonly found: true; readonly appointment: GateAppointment }
  | { readonly found: false; readonly reason: string | null; readonly message: string };

export type PresentationItem =
  | {
      readonly mode: 'vehicular';
      readonly unitId: string;
      readonly driverDocument: string | null;
    }
  | { readonly mode: 'pedestrian'; readonly personId: string };

export type PresentationResult =
  | {
      readonly registered: true;
      readonly unitAccessId: string | null;
      readonly personAccessId: string | null;
      readonly message: string;
    }
  | { readonly registered: false; readonly reason: string; readonly message: string };

export type ConfirmGateEntryRequest = {
  readonly voucherId: string;
  readonly unitAccessIds: readonly string[];
  readonly personAccessIds: readonly string[];
};

export type GateEntryConfirmation = {
  readonly confirmedUnits: number;
  readonly confirmedVisitors: number;
  readonly enteredAt: string | null;
  readonly message: string;
};

export type GateGatewayError =
  | { readonly type: 'network' }
  | { readonly type: 'unauthorized' }
  | { readonly type: 'rejected'; readonly message: string }
  | { readonly type: 'unknown' };

export interface GatePresentationGateway {
  lookup(qrCode: string): Promise<Result<GateLookup, GateGatewayError>>;
  // Un resultado por item, en el mismo orden
  register(
    voucherId: string,
    items: readonly PresentationItem[],
  ): Promise<Result<readonly PresentationResult[], GateGatewayError>>;
  confirm(
    request: ConfirmGateEntryRequest,
  ): Promise<Result<GateEntryConfirmation, GateGatewayError>>;
}

// El backend pide el documento del conductor cuando la unidad no lo tiene asignado
export const DRIVER_DOCUMENT_REQUIRED = 'DRIVER_DOCUMENT_REQUIRED';
