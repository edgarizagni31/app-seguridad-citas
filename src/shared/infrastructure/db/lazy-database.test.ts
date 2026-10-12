import { createTestDatabase } from '@/test/sqljs-database';

import { createLazyDatabase } from './lazy-database';

describe('createLazyDatabase', () => {
  it('abre y migra una sola vez, en el primer uso', async () => {
    const open = jest.fn(createTestDatabase);
    const db = createLazyDatabase(open, [
      { id: 'lazy-001', statements: ['CREATE TABLE t (id TEXT)'] },
    ]);
    expect(open).not.toHaveBeenCalled();

    await Promise.all([db.run('INSERT INTO t VALUES (?)', ['a']), db.all('SELECT * FROM t')]);
    await db.run('INSERT INTO t VALUES (?)', ['b']);

    expect(open).toHaveBeenCalledTimes(1);
    expect(await db.all('SELECT id FROM t ORDER BY id')).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});
