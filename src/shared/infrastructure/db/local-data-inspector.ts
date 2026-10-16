import type { LocalDataInspector, LocalTable } from '@/shared/domain';

import type { SqlDatabase, SqlValue } from './sql-database';

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

export function createLocalDataInspector(db: SqlDatabase): LocalDataInspector {
  const tableNames = async () => {
    const rows = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    return rows.map((row) => row.name);
  };

  const countRows = async (name: string) =>
    (await db.first<{ count: number }>(`SELECT COUNT(*) AS count FROM ${quote(name)}`))?.count ?? 0;

  return {
    async listTables(): Promise<LocalTable[]> {
      const tables: LocalTable[] = [];
      for (const name of await tableNames()) tables.push({ name, rows: await countRows(name) });
      return tables;
    },
    async readTable(name, { limit, offset }) {
      // El nombre no se puede parametrizar: solo se aceptan tablas que existen
      if (!(await tableNames()).includes(name)) return null;
      const columns = await db.all<{ name: string }>(`PRAGMA table_info(${quote(name)})`);
      const rows = await db.all<Record<string, SqlValue>>(
        `SELECT * FROM ${quote(name)} ORDER BY rowid DESC LIMIT ? OFFSET ?`,
        [limit, offset],
      );
      return {
        name,
        columns: columns.map((column) => column.name),
        rows,
        total: await countRows(name),
      };
    },
  };
}
