import { readFile, mkdir, writeFile } from 'node:fs/promises';

import { p256 } from '@noble/curves/nist.js';
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import QRCode from 'qrcode';

const OUTPUT = 'docs/qr-pruebas';

// Sede de los QR del vehículo: el headquarterId elegido en la app (npm run qr:generate -- --site <id>)
const siteArg = process.argv.indexOf('--site');
const SITE_ID = siteArg > -1 ? process.argv[siteArg + 1] : 'site-central';
if (!SITE_ID)
  throw new Error('Falta el id de la sede: npm run qr:generate -- --site <headquarterId>');

const CASES = [
  {
    file: '01-unidad-placa-con-guion',
    content: 'APPSCH00000000000123-ABC-123',
    expected: 'Unidad de transporte · placa ABC-123',
  },
  {
    file: '02-unidad-placa-sin-guion',
    content: 'APPASS000012-ABC123',
    expected: 'Unidad de transporte · placa ABC123',
  },
  {
    file: '03-unidad-documento',
    content: 'APPSCH00000000000123-04512378',
    expected: 'Unidad de transporte · documento 04512378',
  },
  { file: '04-voucher', content: 'VI000007', expected: 'Voucher' },
  { file: '05-pase-visitante', content: 'PASS-9F2C4B7A1D3E5061', expected: 'Pase de visitante' },
  { file: '06-texto-libre', content: 'hola mundo', expected: 'No reconocido' },
  {
    file: '07-demasiado-largo',
    content: `APP${'1'.repeat(498)}`,
    expected: 'No reconocido (501 caracteres)',
  },
];

// Clave de desarrollo: se lee de su única fuente para no duplicarla
const keySource = await readFile('src/shared/infrastructure/demo/dev-qr-keys.ts', 'utf8');
const DEV_PRIVATE_KEY = hexToBytes(keySource.match(/'([0-9a-f]{64})'/)[1]);

const base64Url = (bytes) => Buffer.from(bytes).toString('base64url');
const signVehicleQr = (claims, privateKey = DEV_PRIVATE_KEY) => {
  const input = `${base64Url(utf8ToBytes(JSON.stringify({ alg: 'ES256', typ: 'JWT' })))}.${base64Url(utf8ToBytes(JSON.stringify(claims)))}`;
  return `${input}.${base64Url(p256.sign(utf8ToBytes(input), privateKey))}`;
};

const nowSeconds = Math.floor(Date.now() / 1000);
const DAY = 24 * 3600;
const person = (id, n, dn, r) => ({ id, n, dt: 'DUI', dn, r });
const LUIS = person('vis-luis', 'Luis Hernández', '04512378-9', 'DRIVER');
const MARIO = person('vis-mario', 'Mario Rivas', '05873214-2', 'HELPER');
const PEDRO = person('vis-pedro', 'Pedro Aguilar', '01987654-3', 'HELPER');
const vehicleQr = (overrides) =>
  signVehicleQr(
    {
      jti: `qr-${overrides.plt}-${overrides.jti ?? 'demo'}`,
      sid: SITE_ID,
      apt: 'apt-delosi',
      vch: 'voucher-093',
      vcd: 'APPASP0000000000000093',
      iat: nowSeconds,
      exp: nowSeconds + 30 * DAY,
      vis: [LUIS, MARIO, PEDRO],
      ...overrides,
    },
    overrides.key,
  );

// QR firmados del vehículo para la sede indicada con --site
CASES.push(
  {
    file: '08-vehiculo-abc-123',
    content: vehicleQr({ plt: 'ABC-123' }),
    expected: 'Vehículo ABC-123 · 3 visitantes por ingresar',
  },
  {
    file: '09-vehiculo-llegada-tardia',
    content: vehicleQr({
      plt: 'XYZ-789',
      vis: [
        person('vis-ana', 'Ana Castillo', '03456789-1', 'DRIVER'),
        person('vis-rosa', 'Rosa Méndez', '06123456-7', 'HELPER'),
      ],
    }),
    expected: 'Vehículo XYZ-789 ya ingresó · llegada tardía de Rosa',
  },
  {
    file: '10-vehiculo-ya-ingreso',
    content: vehicleQr({
      plt: 'MNP-456',
      apt: 'apt-dollarcity',
      vch: 'voucher-094',
      vcd: 'APPASP0000000000000094',
      vis: [person('vis-jorge', 'Jorge Molina', '02345678-0', 'DRIVER')],
    }),
    expected: 'Rechazo: la unidad ya ingresó',
  },
  {
    file: '11-vehiculo-otra-sede',
    content: vehicleQr({ plt: 'ABC-123', sid: 'otra-sede' }),
    expected: 'Rechazo: QR de otra sede',
  },
  {
    file: '12-vehiculo-vencido',
    content: vehicleQr({ plt: 'ABC-123', iat: nowSeconds - 2 * DAY, exp: nowSeconds - DAY }),
    expected: 'Rechazo: QR vencido',
  },
  {
    file: '13-vehiculo-falsificado',
    content: vehicleQr({ plt: 'ABC-123', key: p256.utils.randomSecretKey() }),
    expected: 'Rechazo: firma inválida',
  },
  {
    file: '14-vehiculo-lista-negra',
    content: vehicleQr({
      plt: 'ABC-123',
      jti: 'lista-negra',
      vis: [LUIS, person('vis-raul', 'Raúl Pineda', '09876543-2', 'HELPER')],
    }),
    expected: 'ABC-123 · Raúl está en la lista negra',
  },
);

// QR de cita (32 hex) del modo demo: se leen del mock para no duplicarlos
const gateMock = await readFile(
  'src/modules/access-control/infrastructure/mock-gate-gateway.ts',
  'utf8',
);
const appointmentQr = (name) => gateMock.match(new RegExp(`${name}: '([0-9a-f]{32})'`))[1];
CASES.push(
  {
    file: '15-cita-vehicular-delosi',
    content: appointmentQr('delosi'),
    expected: 'Cita DELOSI · ingreso vehicular (4 placas)',
  },
  {
    file: '16-cita-peatonal-dollar-city',
    content: appointmentQr('dollarCity'),
    expected: 'Cita DOLLAR CITY · ingreso peatonal (5 personas)',
  },
  {
    file: '17-cita-no-vigente',
    content: appointmentQr('notEligible'),
    expected: 'Cita PRICESMART no vigente: no deja continuar',
  },
  {
    file: '18-cita-fuera-de-ventana',
    content: appointmentQr('outsideWindow'),
    expected: 'Cita INKAFARMA fuera de ventana: rechaza al confirmar',
  },
  {
    file: '19-cita-inexistente',
    content: '00000000000000000000000000000000',
    expected: 'Cita no encontrada',
  },
);

const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

await mkdir(OUTPUT, { recursive: true });
const cards = [];
for (const { file, content, expected } of CASES) {
  await QRCode.toFile(`${OUTPUT}/${file}.png`, content, { width: 480, margin: 2 });
  const preview = content.length > 60 ? `${content.slice(0, 57)}…` : content;
  cards.push(
    `<figure><img src="${file}.png" alt="${escape(expected)}"><figcaption><b>${escape(expected)}</b><code>${escape(preview)}</code></figcaption></figure>`,
  );
}

const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>QR de prueba · Portal Citas</title>
<style>body{font-family:system-ui;margin:24px;background:#f8fafc}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}
figure{margin:0;padding:16px;background:#fff;border-radius:16px;box-shadow:0 4px 12px #0f172a14}img{width:100%}figcaption{display:grid;gap:6px}code{word-break:break-all;color:#5b6b80}</style>
<h1>QR de prueba · Portal Citas</h1><p>Sede: <code>${SITE_ID}</code></p><main>${cards.join('')}</main></html>`;
await writeFile(`${OUTPUT}/index.html`, html);
console.warn(`${CASES.length} QR generados en ${OUTPUT} (sede ${SITE_ID})`);
