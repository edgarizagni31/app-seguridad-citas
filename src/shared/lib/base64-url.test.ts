import {
  decodeBase64UrlBytes,
  decodeBase64UrlUtf8,
  encodeBase64UrlBytes,
  encodeBase64UrlUtf8,
} from './base64-url';

describe('base64url', () => {
  it('codifica texto UTF-8 sin relleno ni caracteres de URL', () => {
    const encoded = encodeBase64UrlUtf8('{"n":"Luis Hernández ñ?>"}');

    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeBase64UrlUtf8(encoded)).toBe('{"n":"Luis Hernández ñ?>"}');
  });

  it('ida y vuelta de bytes arbitrarios', () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, index) => (index * 37) % 256);

    expect(decodeBase64UrlBytes(encodeBase64UrlBytes(bytes))).toEqual(bytes);
  });

  it('decodifica el header estándar de un JWT', () => {
    expect(decodeBase64UrlUtf8('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(
      '{"alg":"ES256","typ":"JWT"}',
    );
  });
});
