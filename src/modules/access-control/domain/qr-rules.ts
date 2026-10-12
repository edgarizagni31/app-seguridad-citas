// Contrato del contenido de los QR de garita (espejo de QrConst del portal web)
export const QR_RULES = {
  separator: '-',
  generatedCodePattern: /^[A-Z]+\d+$/,
  visitorPassPrefix: 'PASS-',
  maxContentLength: 500,
  // JWT compacto: header.payload.firma en base64url
  signedTokenPattern: /^[\w-]+\.[\w-]+\.[\w-]+$/,
  maxSignedTokenLength: 2048,
} as const;
