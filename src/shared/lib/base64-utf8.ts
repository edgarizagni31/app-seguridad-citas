// btoa/atob solo aceptan Latin-1: se pasa por bytes UTF-8 para soportar ñ, tildes y emojis
export function encodeBase64Utf8(text: string): string {
  const binary = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return btoa(binary);
}

export function decodeBase64Utf8(base64: string): string {
  const percentEncoded = Array.from(
    atob(base64),
    (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
  ).join('');
  return decodeURIComponent(percentEncoded);
}
