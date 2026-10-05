import { decodeBase64Utf8, encodeBase64Utf8 } from './base64-utf8';

describe('base64 UTF-8', () => {
  it('codifica ASCII igual que btoa', () => {
    const json = '{"email":"a@b.com","password":"x"}';

    expect(encodeBase64Utf8(json)).toBe(btoa(json));
  });

  it('codifica caracteres no Latin-1 sin lanzar', () => {
    expect(() => encodeBase64Utf8('contraseña ñandú ✓')).not.toThrow();
  });

  it.each(['', 'Peña', 'año-ÁÉÍÓÚ', 'clave✓🔒', '{"email":"josé@ransa.net"}'])(
    'ida y vuelta conserva el texto: %s',
    (text) => {
      expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text);
    },
  );
});
