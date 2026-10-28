export {
  confirmEntry,
  createEntrySyncHandler,
  entryHistoryFrom,
  entryLogFrom,
  type EntryDeps,
} from './entry-use-cases';
export {
  confirmPedestrianEntry,
  confirmVehicleEntry,
  lookupAppointment,
  presentPerson,
  presentUnit,
  type ConfirmGateError,
  type GateDeps,
  type GateEntryOutcome,
  type GateError,
  type LookupError,
  type PresentError,
  type RejectedCompanion,
} from './gate-presentation-use-cases';
export { readQr } from './read-qr';
export {
  identifyVehicle,
  validateUnit,
  validateVisitor,
  type ValidationDeps,
} from './validate-access';
