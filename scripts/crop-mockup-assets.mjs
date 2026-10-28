import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = 'docs/mockups';
const OUTPUT = 'assets/images';

const CROPS = {
  heroGate: { file: '02-login.png', left: 77, top: 240, width: 697, height: 496 },
  logo: { file: '02-login.png', left: 258, top: 834, width: 340, height: 58 },
  illustration: { file: '04-inicio-vacio.png', left: 130, top: 800, width: 602, height: 345 },
  vehicle: {
    file: 'VisitaInspeccion/Imagen generada 18.png',
    left: 1130,
    top: 208,
    width: 370,
    height: 246,
  },
};

// Imágenes referenciales provisionales del cuestionario (RF-G5b): se reemplazan por las oficiales
const QUESTIONNAIRE = 'CuestionarioInspeccion/Imagen generada 20 (1).png';
const REFERENCE_CROPS = {
  'front-photo': [271, 265, 196, 160],
  'has-trailer': [510, 287, 196, 133],
  'trailer-photo': [748, 288, 196, 117],
  'has-rear-left-seal': [987, 281, 193, 131],
  'rear-left-seal-photo': [1222, 288, 192, 137],
  'has-rear-right-seal': [1455, 280, 187, 118],
  'rear-right-seal-photo': [1455, 280, 187, 118],
  'has-side-door': [77, 717, 210, 113],
  'side-door-photo': [331, 727, 222, 91],
  'has-side-seal': [603, 716, 210, 83],
  'side-seal-photo': [603, 716, 210, 83],
  'cabin-photo': [858, 700, 219, 140],
  'has-waybill': [1124, 717, 213, 114],
  'waybill-photo': [1382, 717, 216, 105],
};

const crop = ({ file, ...region }) => sharp(`${SOURCE}/${file}`).extract(region);

async function buildReferenceImages() {
  await mkdir(`${OUTPUT}/inspection`, { recursive: true });
  for (const [stepId, [left, top, width, height]] of Object.entries(REFERENCE_CROPS)) {
    await crop({ file: QUESTIONNAIRE, left, top, width, height })
      .resize({ width: 600 })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(`${OUTPUT}/inspection/${stepId}.jpg`);
  }
}

// Logo sobre blanco: alpha = 1 - min(rgb) y se recupera el color original de los bordes
function keyOutWhite(data) {
  const out = Buffer.alloc((data.length / 3) * 4);
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const alpha = Math.min(r, g, b) > 245 ? 0 : (255 - Math.min(r, g, b)) / 255;
    const unblend = (c) => (alpha === 0 ? 0 : Math.round((c - (1 - alpha) * 255) / alpha));
    out.set([unblend(r), unblend(g), unblend(b), Math.round(alpha * 255)], o);
  }
  return out;
}

// Variante para fondos oscuros: el verde pasa a blanco y el naranja se conserva
function greenToWhite(rgba) {
  const out = Buffer.from(rgba);
  for (let o = 0; o < out.length; o += 4) {
    if (out[o + 1] > out[o]) out.set([255, 255, 255], o);
  }
  return out;
}

const TEAL_HUE = { min: 170, max: 215 };
const BRAND_HUE = 148;

function rgbToHsl(r, g, b) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? (gn - bn) / d + (gn < bn ? 6 : 0)
      : max === gn
        ? (bn - rn) / d + 2
        : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

// Los acentos teal del mockup pasan al verde de marca sin tocar amarillos ni grises
function tealToBrand(data, channels) {
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const [h, s, l] = rgbToHsl(out[i], out[i + 1], out[i + 2]);
    if (s > 0.2 && h >= TEAL_HUE.min && h <= TEAL_HUE.max) out.set(hslToRgb(BRAND_HUE, s, l), i);
  }
  return out;
}

async function buildIllustration() {
  const { data, info } = await crop(CROPS.illustration).raw().toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: info.channels };
  await sharp(tealToBrand(data, info.channels), { raw })
    .png()
    .toFile(`${OUTPUT}/illustration-scan-empty.png`);
}

async function buildLogos() {
  const { data, info } = await crop(CROPS.logo)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: 4 };
  const color = keyOutWhite(data);
  await sharp(color, { raw }).png().toFile(`${OUTPUT}/logo-ransa360-color.png`);
  await sharp(greenToWhite(color), { raw }).png().toFile(`${OUTPUT}/logo-ransa360-white.png`);
}

const BRAND_GREEN = '#00843D';
const ICON_SIZE = 1024;

// Ícono provisional: logo blanco centrado sobre el verde de marca
async function buildIcons() {
  const logo = await sharp(`${OUTPUT}/logo-ransa360-white.png`).resize({ width: 760 }).toBuffer();
  const canvas = (background) =>
    sharp({ create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background } });

  await canvas(BRAND_GREEN)
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`${OUTPUT}/icon.png`);

  const adaptiveLogo = await sharp(logo).resize({ width: 560 }).toBuffer();
  await canvas({ r: 0, g: 0, b: 0, alpha: 0 })
    .composite([{ input: adaptiveLogo, gravity: 'center' }])
    .png()
    .toFile(`${OUTPUT}/android-icon-foreground.png`);
  await canvas(BRAND_GREEN).png().toFile(`${OUTPUT}/android-icon-background.png`);
}

await mkdir(OUTPUT, { recursive: true });
await crop(CROPS.heroGate).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUTPUT}/hero-gate.jpg`);
await crop(CROPS.vehicle)
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(`${OUTPUT}/vehicle-photo.jpg`);
await buildIllustration();
await buildLogos();
await buildIcons();
await buildReferenceImages();
console.warn(`Assets generados en ${OUTPUT}`);
