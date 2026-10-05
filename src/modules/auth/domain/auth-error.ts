import type { AppError } from '@/shared/domain';

export type AuthError =
  | AppError<'invalid-credentials'>
  | AppError<'password-change-required'>
  | AppError<'network'>
  | AppError<'session-expired'>
  | AppError<'invalid-token'>
  | AppError<'storage'>
  | AppError<'unknown'>;
