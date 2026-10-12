import type { UnitValidation } from './access-validation';
import { err } from '@/shared/domain';
import type { ShiftVisitor } from '@/shared/domain';

import {
  addVisitor,
  arrivedVisitorIds,
  blockVisitor,
  confirmDraft,
  entrySummary,
  markVisitor,
  startDraft,
  type EntryDraft,
} from './vehicle-entry';

const visitor = (id: string, documentNumber: string): ShiftVisitor => ({
  id,
  name: id,
  documentType: 'DUI',
  documentNumber,
  role: 'HELPER',
});
const LUIS = visitor('luis', '04512378-9');
const MARIO = visitor('mario', '05873214-2');
const PEDRO = visitor('pedro', '01987654-3');

const validation = (overrides: Partial<UnitValidation['vehicle']> = {}): UnitValidation =>
  ({
    mode: overrides.enteredAt ? 'late-arrival' : 'entry',
    checkedBy: 'server',
    pendingVisitors: [],
    appointment: {
      id: 'apt',
      voucherId: 'v',
      voucherCode: 'APP1',
      clientName: 'DELOSI',
      carrierName: 'Transportes',
      windowStart: '2026-10-05T15:00:00Z',
      windowEnd: '2026-10-05T17:00:00Z',
    },
    vehicle: {
      id: 'veh',
      plate: 'ABC-123',
      enteredAt: null,
      enteredVisitorIds: [],
      ...overrides,
    },
    qr: { visitors: [LUIS, MARIO, PEDRO] },
  }) as unknown as UnitValidation;

const unwrap = (result: { ok: boolean; value?: EntryDraft }) => {
  if (!result.ok || !result.value) throw new Error('Se esperaba ok');
  return result.value;
};

describe('VehicleEntry', () => {
  it('empieza con todos los visitantes del QR pendientes', () => {
    const draft = startDraft(validation());

    expect(draft.visitors.map((item) => item.status)).toEqual(['pending', 'pending', 'pending']);
    expect(entrySummary(draft)).toEqual({
      entering: 0,
      notArriving: 0,
      pending: 3,
      canConfirm: false,
    });
  });

  it('se puede confirmar cuando todos tienen estado y alguien ingresa', () => {
    let draft = startDraft(validation());
    draft = unwrap(markVisitor(draft, 'luis', 'arrived'));
    draft = unwrap(markVisitor(draft, 'mario', 'not_arrived'));
    expect(entrySummary(draft).canConfirm).toBe(false);

    draft = unwrap(markVisitor(draft, 'pedro', 'arrived'));
    expect(entrySummary(draft)).toEqual({
      entering: 2,
      notArriving: 1,
      pending: 0,
      canConfirm: true,
    });
  });

  it('si nadie llegó no hay ingreso que confirmar', () => {
    let draft = startDraft(validation());
    for (const id of ['luis', 'mario', 'pedro'])
      draft = unwrap(markVisitor(draft, id, 'not_arrived'));

    expect(entrySummary(draft).canConfirm).toBe(false);
    expect(confirmDraft(draft, { id: 'e1', now: new Date() })).toEqual(err({ type: 'incomplete' }));
  });

  it('el visitante agregado queda como llegó y marcado como agregado', () => {
    const draft = unwrap(
      addVisitor(startDraft(validation()), {
        id: 'jose',
        name: '  José Martínez ',
        documentType: 'PASSPORT',
        documentNumber: 'a12345678',
        role: 'HELPER',
      }),
    );

    expect(draft.visitors.at(-1)).toMatchObject({
      name: 'José Martínez',
      documentNumber: 'A12345678',
      status: 'arrived',
      added: true,
    });
  });

  it('no se puede agregar un documento que ya está en la lista', () => {
    expect(
      addVisitor(startDraft(validation()), {
        id: 'x',
        name: 'Copia',
        documentType: 'DUI',
        documentNumber: '04512378 9',
        role: 'DRIVER',
      }),
    ).toEqual(err({ type: 'duplicate-document' }));
  });

  it('un visitante en lista negra no puede marcarse como llegó', () => {
    const draft = unwrap(blockVisitor(startDraft(validation()), 'luis', 'Lista negra'));

    expect(draft.visitors[0]).toMatchObject({
      status: 'not_arrived',
      blockedReason: 'Lista negra',
    });
    expect(markVisitor(draft, 'luis', 'arrived')).toEqual(err({ type: 'blocked-visitor' }));
  });

  it('llegada tardía: los que ya ingresaron quedan bloqueados y fuera del registro', () => {
    let draft = startDraft(
      validation({ enteredAt: '2026-10-05T15:30:00Z', enteredVisitorIds: ['luis', 'mario'] }),
    );

    expect(draft.mode).toBe('late-arrival');
    expect(draft.visitors[0]).toMatchObject({
      status: 'arrived',
      enteredAt: '2026-10-05T15:30:00Z',
    });
    expect(markVisitor(draft, 'luis', 'not_arrived')).toEqual(err({ type: 'locked-visitor' }));

    draft = unwrap(markVisitor(draft, 'pedro', 'arrived'));
    const record = confirmDraft(draft, { id: 'e2', now: new Date('2026-10-05T16:00:00Z') });

    expect(record.ok && record.value.visitors.map((item) => item.id)).toEqual(['pedro']);
    expect(record.ok && arrivedVisitorIds(record.value)).toEqual(['pedro']);
  });
});
