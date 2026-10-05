import { assertNever } from './assert-never';

describe('assertNever', () => {
  it('lanza con el valor inesperado', () => {
    expect(() => assertNever('otro' as never)).toThrow('Caso no contemplado: "otro"');
  });
});
