import { err, isErr, isOk, mapError, mapResult, ok, type Result } from './result';

describe('Result', () => {
  const success = ok(2) as Result<number, string>;
  const failure = err('falló') as Result<number, string>;

  it('distingue éxito y error', () => {
    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  it('mapResult transforma solo el valor exitoso', () => {
    expect(mapResult(success, (n) => n * 10)).toEqual(ok(20));
    expect(mapResult(failure, (n) => n * 10)).toBe(failure);
  });

  it('mapError transforma solo el error', () => {
    expect(mapError(failure, (e) => e.toUpperCase())).toEqual(err('FALLÓ'));
    expect(mapError(success, (e) => e.toUpperCase())).toBe(success);
  });
});
