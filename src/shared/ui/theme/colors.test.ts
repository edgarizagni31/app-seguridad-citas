import { colors } from './colors';

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (foreground: string, background: string) => {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

const WCAG_AA = 4.5;

describe('contraste WCAG AA de los tokens', () => {
  it.each([
    ['texto sobre fondo', colors.text, colors.background],
    ['texto secundario sobre fondo', colors.textMuted, colors.background],
    ['texto secundario sobre tarjeta', colors.textMuted, colors.surface],
    ['texto blanco sobre primario', colors.textOnDark, colors.primary],
    ['texto blanco sobre primario presionado', colors.textOnDark, colors.primaryPressed],
    ['texto primario sobre su tinte', colors.primaryText, colors.primaryTint],
    ['éxito sobre su tinte', colors.success, colors.successTint],
    ['advertencia sobre su tinte', colors.warning, colors.warningTint],
    ['error sobre su tinte', colors.danger, colors.dangerTint],
    ['info sobre su tinte', colors.info, colors.infoTint],
  ])('%s cumple 4,5:1', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(WCAG_AA);
  });
});
