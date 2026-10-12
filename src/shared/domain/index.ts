export type { AppError } from './app-error';
export { assertNever } from './assert-never';
export type { ChangeFeed, ChangeListener } from './change-feed';
export type { Clock } from './clock';
export type { LogContext, LogLevel, Logger } from './logger';
export {
  err,
  isErr,
  isOk,
  mapError,
  mapResult,
  ok,
  type Err,
  type Ok,
  type Result,
} from './result';
export type {
  AttentionItem,
  OutboxHandler,
  OutboxItem,
  OutboxStatus,
  SendFailure,
  SendOutcome,
  SyncSnapshot,
} from './sync';
export type { Connectivity } from './connectivity';
export {
  mergeHistory,
  type HistoryEntry,
  type HistorySource,
  type RecordSyncStatus,
} from './history';
export { SYNC_TABLES, type SyncService } from './sync';
export {
  findBlacklisted,
  findVehicle,
  normalizeDocument,
  normalizePlate,
  SHIFT_TABLES,
  type BlacklistEntry,
  type DocumentType,
  type InspectionStatus,
  type ShiftAppointment,
  type ShiftReader,
  type ShiftSnapshot,
  type ShiftVehicle,
  type ShiftVisitor,
  type VisitorRole,
} from './shift';
