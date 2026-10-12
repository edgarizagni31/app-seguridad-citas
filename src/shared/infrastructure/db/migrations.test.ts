import { createTestDatabase } from '@/test/sqljs-database';

import { runMigrations, type Migration } from './migrations';

const createItems: Migration = {
  id: 'test-001',
  statements: ['CREATE TABLE items (id TEXT PRIMARY KEY, name TEXT NOT NULL)'],
};
const addColumn: Migration = {
  id: 'test-002',
  statements: ['ALTER TABLE items ADD COLUMN qty INTEGER'],
};

describe('runMigrations', () => {
  it('aplica las migraciones pendientes en orden y una sola vez', async () => {
    const db = await createTestDatabase();

    expect(await runMigrations(db, [createItems, addColumn])).toEqual(['test-001', 'test-002']);
    expect(await runMigrations(db, [createItems, addColumn])).toEqual([]);

    await db.run('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', ['a', 'A', 2]);
    expect(await db.first('SELECT qty FROM items WHERE id = ?', ['a'])).toEqual({ qty: 2 });
  });

  it('una migración fallida no deja cambios a medias', async () => {
    const db = await createTestDatabase();
    const broken: Migration = {
      id: 'test-bad',
      statements: ['CREATE TABLE ok (id TEXT)', 'NO ES SQL'],
    };

    await expect(runMigrations(db, [broken])).rejects.toThrow();

    expect(await db.all("SELECT name FROM sqlite_master WHERE name = 'ok'")).toEqual([]);
    expect(await db.all('SELECT id FROM schema_migrations')).toEqual([]);
  });

  it('rechaza ids duplicados', async () => {
    const db = await createTestDatabase();

    await expect(runMigrations(db, [createItems, createItems])).rejects.toThrow('duplicada');
  });
});
