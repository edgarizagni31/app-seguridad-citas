export type AppError<TType extends string = string> = {
  readonly type: TType;
  readonly cause?: unknown;
};
