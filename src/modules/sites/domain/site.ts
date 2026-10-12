import type { ShiftSnapshot } from '@/shared/domain';

export type Site = {
  readonly id: string;
  readonly name: string;
};

export type ShiftStatus =
  | { readonly type: 'no-site' }
  | { readonly type: 'needs-download'; readonly site: Site }
  | { readonly type: 'ready'; readonly site: Site; readonly snapshot: ShiftSnapshot };
