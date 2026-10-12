import { err, ok } from '@/shared/domain';

import { checkVisitorAccess, isValidDocument } from './visitor-policy';

describe('isValidDocument', () => {
  it.each([
    ['DUI', '04512378-9', true],
    ['DUI', '045123789', false],
    ['DUI', '0451237-89', false],
    ['PASSPORT', 'A1234567', true],
    ['PASSPORT', 'A-1', false],
    ['RESIDENT_CARD', 'CR-12345', true],
    ['DRIVER_LICENSE', '0614-250390-102-3', true],
    ['DRIVER_LICENSE', 'x'.repeat(21), false],
  ] as const)('%s %s → %s', (type, number, valid) => {
    expect(isValidDocument(type, number)).toBe(valid);
  });
});

describe('checkVisitorAccess', () => {
  const snapshot = {
    blacklist: [
      { documentType: 'DUI' as const, documentNumber: '09876543-2', reason: 'Incidente' },
    ],
  };

  it('bloquea un documento en la lista negra, sin importar guiones ni espacios', () => {
    expect(
      checkVisitorAccess(snapshot, { documentType: 'DUI', documentNumber: '09876543 2' }),
    ).toEqual(err({ type: 'VisitorBlacklisted', reason: 'Incidente' }));
  });

  it('deja pasar documentos que no están en la lista', () => {
    expect(
      checkVisitorAccess(snapshot, { documentType: 'DUI', documentNumber: '04512378-9' }),
    ).toEqual(ok(undefined));
  });

  it('el tipo de documento importa', () => {
    expect(
      checkVisitorAccess(snapshot, { documentType: 'PASSPORT', documentNumber: '09876543-2' }).ok,
    ).toBe(true);
  });
});
