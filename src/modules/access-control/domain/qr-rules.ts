// Contrato del contenido de los QR de garita (espejo de QrConst del portal web)
export const QR_RULES = {
  separator: '-',
  generatedCodePattern: /^[A-Z]+\d+$/,
  visitorPassPrefix: 'PASS-',
  maxContentLength: 500,
} as const;
