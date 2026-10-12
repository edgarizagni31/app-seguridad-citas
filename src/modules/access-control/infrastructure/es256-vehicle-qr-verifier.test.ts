import { p256 } from '@noble/curves/nist.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { err } from '@/shared/domain';
import { DEV_QR_PUBLIC_KEY_HEX, signVehicleQr } from '@/shared/infrastructure/demo';
import { decodeBase64UrlBytes, encodeBase64UrlBytes, encodeBase64UrlUtf8 } from '@/shared/lib';
import { buildVehicleQrClaims } from '@/test/factories/vehicle-qr';

import { es256VehicleQrVerifier } from './es256-vehicle-qr-verifier';

const verify = (token: string, key = DEV_QR_PUBLIC_KEY_HEX) =>
  es256VehicleQrVerifier.verify(token, key);

describe('es256VehicleQrVerifier', () => {
  it('acepta un QR firmado y traduce los claims', () => {
    const result = verify(signVehicleQr(buildVehicleQrClaims()));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      tokenId: 'qr-0001',
      siteId: 'site-central',
      appointmentId: 'apt-delosi',
      voucherCode: 'APPASP0000000000000093',
      plate: 'ABC-123',
      expiresAt: new Date('2026-10-06T16:42:00Z'),
      notBefore: null,
    });
    expect(result.value.visitors[0]).toEqual({
      id: 'vis-luis',
      name: 'Luis Hernández',
      documentType: 'DUI',
      documentNumber: '04512378-9',
      role: 'DRIVER',
    });
  });

  it('rechaza un QR con el contenido alterado', () => {
    const [header, , signature] = signVehicleQr(buildVehicleQrClaims()).split('.');
    const forged = encodeBase64UrlUtf8(JSON.stringify(buildVehicleQrClaims({ plt: 'ZZZ-999' })));

    expect(verify(`${header}.${forged}.${signature}`)).toEqual(err({ type: 'InvalidSignature' }));
  });

  it('rechaza un QR firmado con otra clave', () => {
    const otherKey = p256.utils.randomSecretKey();

    expect(verify(signVehicleQr(buildVehicleQrClaims(), otherKey))).toEqual(
      err({ type: 'InvalidSignature' }),
    );
  });

  it('acepta firmas con S alto, como las de firmantes estándar', () => {
    const [header, payload, signature = ''] = signVehicleQr(buildVehicleQrClaims()).split('.');
    const parsed = p256.Signature.fromBytes(decodeBase64UrlBytes(signature));
    const highS = new p256.Signature(parsed.r, p256.Point.CURVE().n - parsed.s).toBytes();

    expect(verify(`${header}.${payload}.${encodeBase64UrlBytes(highS)}`).ok).toBe(true);
  });

  it('un contenido que no es JWT tiene formato inválido', () => {
    expect(verify('hola.mundo')).toEqual(err({ type: 'InvalidFormat' }));
    expect(verify('a.b.c')).toEqual(err({ type: 'InvalidFormat' }));
  });

  it('rechaza algoritmos distintos de ES256', () => {
    const [, payload, signature] = signVehicleQr(buildVehicleQrClaims()).split('.');
    const none = encodeBase64UrlUtf8(JSON.stringify({ alg: 'none', typ: 'JWT' }));

    expect(verify(`${none}.${payload}.${signature}`)).toEqual(err({ type: 'InvalidFormat' }));
  });

  it('un QR bien firmado con claims incompletos tiene formato inválido', () => {
    const { vis: _, ...withoutVisitors } = buildVehicleQrClaims();

    expect(verify(signVehicleQr(withoutVisitors as never))).toEqual(err({ type: 'InvalidFormat' }));
  });

  it('una clave pública corrupta nunca valida', () => {
    expect(verify(signVehicleQr(buildVehicleQrClaims()), 'zz')).toEqual(
      err({ type: 'InvalidSignature' }),
    );
    expect(verify(signVehicleQr(buildVehicleQrClaims()), bytesToHex(new Uint8Array(65)))).toEqual(
      err({ type: 'InvalidSignature' }),
    );
  });
});
