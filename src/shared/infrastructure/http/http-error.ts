export type HttpError =
  | { readonly type: 'network'; readonly cause?: unknown }
  | { readonly type: 'timeout' }
  | { readonly type: 'unauthorized'; readonly message?: string }
  | { readonly type: 'http'; readonly status: number; readonly message?: string }
  | { readonly type: 'invalid-response'; readonly issues: string };
