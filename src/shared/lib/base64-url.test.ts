import {
  decodeBase64UrlBytes,
  decodeBase64UrlUtf8,
  encodeBase64Bytes,
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

  it('codifica archivos grandes en base64 estándar sin desbordar la pila', () => {
    const big = Uint8Array.from({ length: 600_000 }, (_, index) => index % 256);

    const encoded = encodeBase64Bytes(big);

    expect(encoded).toHaveLength(800_000);
    expect(Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))).toEqual(big);
    expect(encodeBase64Bytes(Uint8Array.from([251, 255]))).toBe('+/8=');
  });

  it('decodifica el header estándar de un JWT', () => {
    expect(decodeBase64UrlUtf8('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(
      '{"alg":"ES256","typ":"JWT"}',
    );
  });
});
