import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { SqlDatabase, SqlParams } from './sql-database';

const DATABASE_NAME = 'portal-citas.db';

type Executor = Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync'>;

function toSqlDatabase(executor: Executor, transaction: SqlDatabase['transaction']): SqlDatabase {
  return {
    exec: (sql) => executor.execAsync(sql),
    run: async (sql, params: SqlParams = []) => {
      await executor.runAsync(sql, [...params]);
    },
    all: <T>(sql: string, params: SqlParams = []) => executor.getAllAsync<T>(sql, [...params]),
    first: <T>(sql: string, params: SqlParams = []) => executor.getFirstAsync<T>(sql, [...params]),
    transaction,
  };
}

export async function openExpoSqliteDatabase(name = DATABASE_NAME): Promise<SqlDatabase> {
  const db = await openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  return toSqlDatabase(db, (task) =>
    db.withExclusiveTransactionAsync((txn) => {
      // Una transacción anidada reutiliza la ya abierta
      const tx: SqlDatabase = toSqlDatabase(txn, (inner) => inner(tx));
      return task(tx);
    }),
  );
}
