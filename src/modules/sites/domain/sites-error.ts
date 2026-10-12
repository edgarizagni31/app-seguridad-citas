import type { AppError } from '@/shared/domain';

export type SitesError =
  | AppError<'network'>
  | AppError<'unauthorized'>
  | AppError<'no-sites'>
  | AppError<'no-site-selected'>
  | AppError<'storage'>
  | AppError<'unknown'>;
