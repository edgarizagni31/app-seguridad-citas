import { decodeBase64Utf8, encodeBase64Utf8 } from './base64-utf8';

const toBase64 = (base64Url: string) => {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
};

const toBase64Url = (base64: string) =>
  base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const decodeBase64UrlUtf8 = (value: string) => decodeBase64Utf8(toBase64(value));

export const encodeBase64UrlUtf8 = (text: string) => toBase64Url(encodeBase64Utf8(text));

export const decodeBase64UrlBytes = (value: string) =>
  Uint8Array.from(atob(toBase64(value)), (char) => char.charCodeAt(0));

// Por bloques: String.fromCharCode(...bytes) desborda la pila con archivos grandes (fotos)
const CHUNK = 0x8000;
export function encodeBase64Bytes(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return btoa(binary);
}

export const encodeBase64UrlBytes = (bytes: Uint8Array) => toBase64Url(encodeBase64Bytes(bytes));
