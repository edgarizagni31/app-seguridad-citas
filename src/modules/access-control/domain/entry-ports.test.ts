import { buildEntryRecord } from '@/test/factories/entry';

import { toConfirmEntryRequest } from './entry-ports';

describe('toConfirmEntryRequest', () => {
  it('envía id solo para visitantes del QR y traduce el estado de llegada', () => {
    const record = buildEntryRecord();
    const added = {
      ...record.visitors[0]!,
      id: 'nuevo',
      name: 'José Martínez',
      added: true,
    };

    const request = toConfirmEntryRequest({ ...record, visitors: [...record.visitors, added] });

    expect(request.visitors.map((visitor) => [visitor.visitorId, visitor.status])).toEqual([
      ['vis-luis', 'ARRIVED'],
      ['vis-pedro', 'NOT_ARRIVED'],
      [null, 'ARRIVED'],
    ]);
    expect(request).toMatchObject({ entryId: 'entry-1', plate: 'ABC-123' });
  });
});
