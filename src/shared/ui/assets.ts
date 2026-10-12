import type { ImageSource } from 'expo-image';

// Recortes provisionales de los mockups: se reemplazan aquí por los oficiales
export const ASSETS = {
  heroGate: require('../../../assets/images/hero-gate.jpg') as ImageSource,
  logoColor: require('../../../assets/images/logo-ransa360-color.png') as ImageSource,
  logoWhite: require('../../../assets/images/logo-ransa360-white.png') as ImageSource,
  vehiclePhoto: require('../../../assets/images/vehicle-photo.jpg') as ImageSource,
  illustrationScanEmpty:
    require('../../../assets/images/illustration-scan-empty.png') as ImageSource,
} as const;

export const LOGO_ASPECT_RATIO = 340 / 58;
