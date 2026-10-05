import { encodeBase64Utf8 } from '@/shared/lib';

const base64Url = (value: object) =>
  encodeBase64Utf8(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const R360_CLAIMS = {
  sub: '42325c9f-0000-4324-bcff-0fdf91654784',
  'cognito:groups': ['R360_CONFIGURACION', 'PACCESO_ASEGURIDAD'],
  'cognito:username': 'carlos.mendez@empresa.com',
  name: 'Carlos Andrés',
  family_name: 'Méndez Rivas',
  email: 'carlos.mendez@empresa.com',
  token_use: 'id',
  iat: 1791215420,
  exp: 1791219020,
};

export const buildJwt = (payload: object = R360_CLAIMS) =>
  `${base64Url({ alg: 'RS256', kid: 'test' })}.${base64Url(payload)}.firma`;
