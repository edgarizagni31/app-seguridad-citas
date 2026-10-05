import type { ExpoConfig } from 'expo/config';

const VARIANTS = {
  development: { nameSuffix: ' (Dev)', idSuffix: '.dev', schemeSuffix: '-dev' },
  preview: { nameSuffix: ' (QA)', idSuffix: '.preview', schemeSuffix: '-preview' },
  production: { nameSuffix: '', idSuffix: '', schemeSuffix: '' },
} as const;

type Variant = keyof typeof VARIANTS;

const BASE_ID = 'com.ransa.portalcitas';
const CAMERA_PERMISSION = 'Usamos la cámara para escanear los códigos QR de las citas en garita.';

function isVariant(value: string): value is Variant {
  return Object.hasOwn(VARIANTS, value);
}

function resolveVariant(value: string | undefined): Variant {
  if (!value) return 'development';
  if (isVariant(value)) return value;
  throw new Error(`APP_VARIANT inválido: "${value}". Usa development, preview o production.`);
}

const variant = resolveVariant(process.env.APP_VARIANT);
const { nameSuffix, idSuffix, schemeSuffix } = VARIANTS[variant];
const appId = `${BASE_ID}${idSuffix}`;

const config: ExpoConfig = {
  name: `Portal Citas${nameSuffix}`,
  slug: 'portal-citas',
  version: '1.0.0',
  scheme: `portalcitas${schemeSuffix}`,
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/images/icon.png',
  runtimeVersion: { policy: 'fingerprint' },
  ios: {
    bundleIdentifier: appId,
    supportsTablet: false,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: appId,
    adaptiveIcon: {
      backgroundColor: '#00843D',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-foreground.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0F172A',
        image: './assets/images/logo-ransa360-white.png',
        imageWidth: 200,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: CAMERA_PERMISSION,
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    'expo-secure-store',
    [
      'expo-build-properties',
      // En development el servidor de Metro usa HTTP; fuera de él solo HTTPS
      { android: variant === 'development' ? {} : { usesCleartextTraffic: false } },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: { appVariant: variant },
};

export default config;
