import type { SqlDatabase } from './sql-database';

export type Migration = {
  readonly id: string;
  readonly statements: readonly string[];
};

const CREATE_REGISTRY = `CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
)`;

export async function runMigrations(
  db: SqlDatabase,
  migrations: readonly Migration[],
  now: () => Date = () => new Date(),
): Promise<string[]> {
  const ids = migrations.map((migration) => migration.id);
  const duplicated = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicated) throw new Error(`Migración duplicada: ${duplicated}`);

  await db.exec(CREATE_REGISTRY);
  const applied = new Set(
    (await db.all<{ id: string }>('SELECT id FROM schema_migrations')).map((row) => row.id),
  );

  const pending = migrations.filter((migration) => !applied.has(migration.id));
  for (const migration of pending) {
    await db.transaction(async (tx) => {
      for (const statement of migration.statements) await tx.exec(statement);
      await tx.run('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [
        migration.id,
        now().toISOString(),
      ]);
    });
  }
  return pending.map((migration) => migration.id);
}
