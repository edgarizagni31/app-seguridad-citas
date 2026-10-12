import { p256 } from '@noble/curves/nist.js';
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { z } from 'zod';

import type { VehicleQr, VehicleQrVerifier } from '../domain';
import { err, ok } from '@/shared/domain';
import { decodeBase64UrlBytes, decodeBase64UrlUtf8 } from '@/shared/lib';

const SIGNATURE_BYTES = 64;
const id = z.string().min(1).max(64);

const headerSchema = z.object({ alg: z.literal('ES256'), typ: z.literal('JWT').optional() });

const claimsSchema = z.object({
  jti: id,
  sid: id,
  apt: id,
  vch: id,
  vcd: id,
  plt: z.string().min(1).max(20),
  iat: z.number().int(),
  exp: z.number().int(),
  nbf: z.number().int().optional(),
  vis: z
    .array(
      z.object({
        id,
        n: z.string().min(1).max(120),
        dt: z.enum(['DUI', 'PASSPORT', 'RESIDENT_CARD', 'DRIVER_LICENSE']),
        dn: z.string().min(1).max(20),
        r: z.enum(['DRIVER', 'HELPER']),
      }),
    )
    .max(20),
});

type Claims = z.infer<typeof claimsSchema>;

const fromSeconds = (seconds: number) => new Date(seconds * 1000);

const parseJson = (base64Url: string): unknown => {
  try {
    return JSON.parse(decodeBase64UrlUtf8(base64Url));
  } catch {
    return null;
  }
};

const toVehicleQr = (claims: Claims): VehicleQr => ({
  tokenId: claims.jti,
  siteId: claims.sid,
  appointmentId: claims.apt,
  voucherId: claims.vch,
  voucherCode: claims.vcd,
  plate: claims.plt,
  issuedAt: fromSeconds(claims.iat),
  expiresAt: fromSeconds(claims.exp),
  notBefore: claims.nbf === undefined ? null : fromSeconds(claims.nbf),
  visitors: claims.vis.map((visitor) => ({
    id: visitor.id,
    name: visitor.n,
    documentType: visitor.dt,
    documentNumber: visitor.dn,
    role: visitor.r,
  })),
});

function hasValidSignature(signingInput: string, signature: string, publicKeyHex: string) {
  try {
    const bytes = decodeBase64UrlBytes(signature);
    if (bytes.length !== SIGNATURE_BYTES) return false;
    // lowS: false porque los firmantes estándar (backend) no normalizan S
    return p256.verify(bytes, utf8ToBytes(signingInput), hexToBytes(publicKeyHex), {
      lowS: false,
    });
  } catch {
    return false;
  }
}

export const es256VehicleQrVerifier: VehicleQrVerifier = {
  verify(token, publicKeyHex) {
    const parts = token.split('.');
    const [header, payload, signature] = parts;
    if (parts.length !== 3 || !header || !payload || !signature) {
      return err({ type: 'InvalidFormat' });
    }
    if (!headerSchema.safeParse(parseJson(header)).success) return err({ type: 'InvalidFormat' });

    // Nunca se interpreta el contenido antes de comprobar la firma
    if (!hasValidSignature(`${header}.${payload}`, signature, publicKeyHex)) {
      return err({ type: 'InvalidSignature' });
    }
    const claims = claimsSchema.safeParse(parseJson(payload));
    return claims.success ? ok(toVehicleQr(claims.data)) : err({ type: 'InvalidFormat' });
  },
};
