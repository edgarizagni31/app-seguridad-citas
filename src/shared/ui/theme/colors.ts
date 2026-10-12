export const colors = {
  brand: '#009A44',
  // Verde más oscuro para fondos con texto blanco: cumple WCAG AA (4,5:1)
  primary: '#00843D',
  primaryPressed: '#006B32',
  primaryTint: '#E6F5EC',
  primaryText: '#007A38',
  accent: '#F28C00',
  // Borde amarillo de la placa del vehículo (mockup HSE)
  plateBorder: '#F2C94C',
  scannerFrame: '#2EE59D',
  text: '#1E293B',
  textMuted: '#5B6B80',
  textOnDark: '#FFFFFF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  inputBackground: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  overlay: 'rgba(15, 23, 42, 0.55)',
  translucentDark: 'rgba(15, 23, 42, 0.6)',
  cameraBackground: '#000000',
  success: '#13773A',
  successTint: '#E8F5EE',
  warning: '#B45309',
  warningTint: '#FEF3E2',
  danger: '#C81E1E',
  dangerTint: '#FDECEC',
  info: '#1D4ED8',
  infoTint: '#E8F0FE',
} as const;

export type ColorToken = keyof typeof colors;
