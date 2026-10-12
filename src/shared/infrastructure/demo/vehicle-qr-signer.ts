import { p256 } from '@noble/curves/nist.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

import { DEV_QR_PRIVATE_KEY } from './dev-qr-keys';
import { encodeBase64UrlBytes, encodeBase64UrlUtf8 } from '@/shared/lib';

// Claims compactos del QR del vehículo; ver docs/CONTRATO-API-INGRESO-INSPECCION.md
export type VehicleQrClaims = {
  readonly jti: string;
  readonly sid: string;
  readonly apt: string;
  readonly vch: string;
  readonly vcd: string;
  readonly plt: string;
  readonly iat: number;
  readonly exp: number;
  readonly nbf?: number;
  readonly vis: readonly {
    readonly id: string;
    readonly n: string;
    readonly dt: string;
    readonly dn: string;
    readonly r: string;
  }[];
};

const HEADER = encodeBase64UrlUtf8(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));

// SOLO desarrollo y pruebas: el backend real firma en el servidor
export function signVehicleQr(claims: VehicleQrClaims, privateKey = DEV_QR_PRIVATE_KEY): string {
  const signingInput = `${HEADER}.${encodeBase64UrlUtf8(JSON.stringify(claims))}`;
  const signature = p256.sign(utf8ToBytes(signingInput), privateKey);
  return `${signingInput}.${encodeBase64UrlBytes(signature)}`;
}
