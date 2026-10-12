import { runMigrations, type Migration } from './migrations';
import type { SqlDatabase } from './sql-database';

// Abre y migra la base la primera vez que se usa, en una sola promesa compartida
export function createLazyDatabase(
  open: () => Promise<SqlDatabase>,
  migrations: readonly Migration[],
): SqlDatabase {
  let ready: Promise<SqlDatabase> | undefined;
  const database = () => {
    ready ??= open().then(async (db) => {
      await runMigrations(db, migrations);
      return db;
    });
    return ready;
  };
  return {
    exec: async (sql) => (await database()).exec(sql),
    run: async (sql, params) => (await database()).run(sql, params),
    all: async (sql, params) => (await database()).all(sql, params),
    first: async (sql, params) => (await database()).first(sql, params),
    transaction: async (task) => (await database()).transaction(task),
  };
}
