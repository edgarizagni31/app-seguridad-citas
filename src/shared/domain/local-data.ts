// Lectura de solo consulta de la base local, para que soporte revise lo guardado en el teléfono
export type LocalTable = {
  readonly name: string;
  readonly rows: number;
};

export type LocalCell = string | number | null;

export type LocalTablePage = {
  readonly name: string;
  readonly columns: readonly string[];
  readonly rows: readonly Readonly<Record<string, LocalCell>>[];
  readonly total: number;
};

export interface LocalDataInspector {
  listTables(): Promise<LocalTable[]>;
  // null si la tabla no existe
  readTable(
    name: string,
    page: { readonly limit: number; readonly offset: number },
  ): Promise<LocalTablePage | null>;
}
