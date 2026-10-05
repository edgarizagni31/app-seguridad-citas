import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const OUTPUT = 'docs/qr-pruebas';

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
<h1>QR de prueba · Portal Citas</h1><main>${cards.join('')}</main></html>`;
await writeFile(`${OUTPUT}/index.html`, html);
console.warn(`${CASES.length} QR generados en ${OUTPUT}`);
