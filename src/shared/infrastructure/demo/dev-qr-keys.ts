import { p256 } from '@noble/curves/nist.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

// SOLO desarrollo: el backend real firma con su propia clave privada
export const DEV_QR_PRIVATE_KEY = hexToBytes(
  '7c4a1d2f9e8b3a6c5d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e',
);

export const DEV_QR_PUBLIC_KEY_HEX = bytesToHex(p256.getPublicKey(DEV_QR_PRIVATE_KEY, false));
