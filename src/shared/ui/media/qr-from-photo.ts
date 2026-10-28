import { scanFromURLAsync } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';

export type QrFromPhoto =
  | { readonly type: 'canceled' }
  | { readonly type: 'found'; readonly data: string }
  | { readonly type: 'not-found' };

// Lee el QR de una foto de la galería; el selector del sistema no pide permisos
export async function pickQrFromPhoto(): Promise<QrFromPhoto> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const uri = picked.canceled ? null : picked.assets[0]?.uri;
  if (!uri) return { type: 'canceled' };
  const [code] = await scanFromURLAsync(uri, ['qr']);
  return code?.data ? { type: 'found', data: code.data } : { type: 'not-found' };
}
