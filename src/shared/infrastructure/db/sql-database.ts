export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

export interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<void>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  first<T>(sql: string, params?: SqlParams): Promise<T | null>;
  transaction(task: (tx: SqlDatabase) => Promise<void>): Promise<void>;
}
