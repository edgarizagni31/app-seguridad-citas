export type { AccessGatewayError, AccessValidationGateway, ServerVerdict } from './access-gateway';
export type {
  CheckedBy,
  IdentifiedVehicle,
  UnitValidation,
  UnitValidationError,
  VisitorValidation,
  VisitorValidationError,
} from './access-validation';
export {
  DOCUMENT_STATUS,
  DRIVER_DOCUMENT_REQUIRED,
  type ConfirmGateEntryRequest,
  type GateAppointment,
  type GateDocument,
  type GateDriver,
  type GateEntryConfirmation,
  type GateGatewayError,
  type GateLookup,
  type GatePerson,
  type GatePresentationGateway,
  type GateUnit,
  type PresentationItem,
  type PresentationResult,
} from './gate-presentation';
export {
  availableModes,
  checkDocument,
  chooseMode,
  companionItems,
  driverOf,
  isDriver,
  markCompanion,
  matchesPerson,
  matchesUnit,
  nonDrivers,
  pedestrianConfirmRequest,
  presentedPeopleCount,
  presentedUnitCount,
  recordPerson,
  recordUnit,
  startSession,
  unitNumber,
  vehicleConfirmRequest,
  visibleDocuments,
  type DocumentCheck,
  type GateMode,
  type GateSession,
  type NothingToConfirm,
  type PresentedUnit,
} from './gate-session';
export { parseQrContent, type QrContent, type QrContentKind } from './qr-content';
export { QR_RULES } from './qr-rules';
export type { ScanRecord } from './scan-record';
export {
  admitUnit,
  entryWindow,
  type UnitAdmission,
  type UnitRejection,
} from './unit-entry-policy';
export {
  checkQrValidity,
  QR_CLOCK_SKEW_MS,
  type VehicleQr,
  type VehicleQrError,
  type VehicleQrVerifier,
} from './vehicle-qr';
export {
  checkVisitorAccess,
  DOCUMENT_TYPES,
  isValidDocument,
  type VisitorDocument,
  type VisitorRejection,
} from './visitor-policy';
export {
  addVisitor,
  arrivedVisitorIds,
  blockVisitor,
  confirmDraft,
  entrySummary,
  markVisitor,
  startDraft,
  type ArrivalStatus,
  type ConfirmEntryError,
  type EntryDraft,
  type EntryError,
  type EntryVisitor,
  type NewVisitor,
  type VehicleEntryRecord,
} from './vehicle-entry';
export {
  ENTRY_OUTBOX_KIND,
  toConfirmEntryRequest,
  type ConfirmEntryRequest,
  type EntryRepository,
  type StoredEntry,
} from './entry-ports';
