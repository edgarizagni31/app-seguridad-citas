import { initialsOf } from './avatar';

describe('initialsOf', () => {
  it.each([
    ['Carlos Méndez', 'CM'],
    ['patricia berenice silva', 'PB'],
    ['  Ana  ', 'A'],
    ['', ''],
  ])('%s → %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
