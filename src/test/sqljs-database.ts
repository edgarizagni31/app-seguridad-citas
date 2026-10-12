import initSqlJs, { type Database } from 'sql.js';

import type { SqlDatabase, SqlParams } from '@/shared/infrastructure/db';

let sqlJs: Awaited<ReturnType<typeof initSqlJs>> | undefined;

function toSqlDatabase(db: Database): SqlDatabase {
  const rows = <T>(sql: string, params: SqlParams = []): T[] => {
    const statement = db.prepare(sql);
    statement.bind([...params]);
    const result: T[] = [];
    while (statement.step()) result.push(statement.getAsObject() as T);
    statement.free();
    return result;
  };
  const self: SqlDatabase = {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => {
      db.run(sql, [...params]);
    },
    all: async (sql, params) => rows(sql, params),
    first: async <T>(sql: string, params?: SqlParams) => rows<T>(sql, params)[0] ?? null,
    transaction: async (task) => {
      db.exec('BEGIN');
      try {
        await task(self);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return self;
}

// SQLite real en memoria para probar adaptadores en Jest
export async function createTestDatabase(): Promise<SqlDatabase> {
  sqlJs ??= await initSqlJs();
  const db = new sqlJs.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  return toSqlDatabase(db);
}
