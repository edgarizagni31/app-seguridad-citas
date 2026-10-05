import Constants from 'expo-constants';
import { z } from 'zod';

const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('es', { timeZone });
    return true;
  } catch {
    return false;
  }
};

const envSchema = z
  .object({
    appVariant: z.enum(['development', 'preview', 'production']),
    appVersion: z.string().min(1),
    apiUrl: z.url({ protocol: /^https?$/ }),
    r360ApiUrl: z.url({ protocol: /^https?$/ }),
    authProvider: z.enum(['r360', 'mock']),
    timeZone: z.string().refine(isValidTimeZone, 'Zona horaria IANA inválida'),
  })
  .refine((env) => !(env.appVariant === 'production' && env.authProvider === 'mock'), {
    message: 'El proveedor de auth "mock" no está permitido en production',
    path: ['authProvider'],
  })
  .refine(
    (env) =>
      env.appVariant === 'development' ||
      [env.apiUrl, env.r360ApiUrl].every((url) => url.startsWith('https://')),
    { message: 'Fuera de development las URLs deben usar HTTPS', path: ['apiUrl'] },
  );

export type Env = z.infer<typeof envSchema>;
export type RawEnv = Record<keyof Env, string | undefined>;

export function parseEnv(raw: RawEnv): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Configuración de entorno inválida:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

// Expo solo incrusta EXPO_PUBLIC_* cuando se leen de forma estática
export function readRawEnv(): RawEnv {
  return {
    appVariant: asString(Constants.expoConfig?.extra?.appVariant),
    appVersion: Constants.expoConfig?.version,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    r360ApiUrl: process.env.EXPO_PUBLIC_R360_API_URL,
    authProvider: process.env.EXPO_PUBLIC_AUTH_PROVIDER,
    timeZone: process.env.EXPO_PUBLIC_TIME_ZONE,
  };
}

export const loadEnv = (): Env => parseEnv(readRawEnv());
