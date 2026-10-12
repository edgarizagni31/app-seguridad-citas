import { parseQrContent } from './qr-content';

describe('parseQrContent · casos portados del portal web', () => {
  it('conserva la placa completa cuando contiene un guion', () => {
    expect(parseQrContent('APPSCH00000000000123-ABC-123')).toEqual({
      kind: 'codeWithSuffix',
      code: 'APPSCH00000000000123',
      suffix: 'ABC-123',
      raw: 'APPSCH00000000000123-ABC-123',
    });
  });

  it('parsea una placa sin guion', () => {
    expect(parseQrContent('APPASS000012-ABC123')).toMatchObject({
      kind: 'codeWithSuffix',
      code: 'APPASS000012',
      suffix: 'ABC123',
    });
  });

  it('parsea el formato heredado de código + documento', () => {
    expect(parseQrContent('APPSCH00000000000123-04512378')).toMatchObject({
      kind: 'codeWithSuffix',
      suffix: '04512378',
    });
  });

  it('reconoce un código sin sufijo', () => {
    expect(parseQrContent('APPMAN000001')).toEqual({
      kind: 'code',
      code: 'APPMAN000001',
      raw: 'APPMAN000001',
    });
  });

  it('reconoce un pase de visitante', () => {
    expect(parseQrContent('PASS-9F2C4B7A1D3E5061')).toEqual({
      kind: 'visitorPass',
      passCode: 'PASS-9F2C4B7A1D3E5061',
      raw: 'PASS-9F2C4B7A1D3E5061',
    });
  });

  it.each(['', null, undefined, '   '])('rechaza contenido vacío (%p)', (value) => {
    expect(parseQrContent(value).kind).toBe('unknown');
  });

  it.each([
    ['B00000042-ABC-123', 'codeWithSuffix'],
    ['VI000007', 'code'],
    ['TR000015-04512378', 'codeWithSuffix'],
  ])('acepta prefijos distintos de APP: %s → %s', (value, kind) => {
    expect(parseQrContent(value).kind).toBe(kind);
  });

  it.each(['CUALQUIER COSA-ABC-123', '123456-ABC'])(
    'rechaza un código que no sigue el formato del backend: %s',
    (value) => {
      expect(parseQrContent(value).kind).toBe('unknown');
    },
  );

  it('rechaza un sufijo vacío', () => {
    expect(parseQrContent('APPSCH00000000000123-').kind).toBe('unknown');
  });

  it('rechaza contenido que excede el límite de ScannedContent', () => {
    expect(parseQrContent('A'.repeat(501)).kind).toBe('unknown');
  });
});

describe('parseQrContent · casos adicionales', () => {
  it('acepta exactamente 500 caracteres', () => {
    expect(parseQrContent(`APP${'1'.repeat(497)}`).kind).toBe('code');
  });

  it('recorta espacios del contenido y alrededor del separador', () => {
    expect(parseQrContent('  APPSCH1 - ABC-123  ')).toEqual({
      kind: 'codeWithSuffix',
      code: 'APPSCH1',
      suffix: 'ABC-123',
      raw: 'APPSCH1 - ABC-123',
    });
  });

  it('reconoce pases de visitante en minúsculas', () => {
    expect(parseQrContent('pass-abc').kind).toBe('visitorPass');
  });

  it('rechaza texto libre y URLs', () => {
    expect(parseQrContent('hola mundo').kind).toBe('unknown');
    expect(parseQrContent('https://ransa.net').kind).toBe('unknown');
  });

  it('no confunde un código en minúsculas con uno generado', () => {
    expect(parseQrContent('appsch123').kind).toBe('unknown');
  });
});

describe('parseQrContent · QR firmado del vehículo', () => {
  it('reconoce un JWT compacto aunque supere el largo de los QR clásicos', () => {
    const token = `eyJhbGciOiJFUzI1NiJ9.${'a'.repeat(700)}.c2lnbmF0dXJl`;

    expect(parseQrContent(token)).toEqual({ kind: 'vehicleToken', token, raw: token });
  });

  it('un texto con puntos que no es base64url no es un token', () => {
    expect(parseQrContent('a.b c.d').kind).toBe('unknown');
  });
});
