import { Platform, type TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

const variant = (fontFamily: string, fontSize: number, lineHeight: number): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
});

export const typography = {
  display: variant(fontFamilies.semibold, 32, 38),
  title: variant(fontFamilies.semibold, 28, 34),
  heading: variant(fontFamilies.semibold, 22, 28),
  body: variant(fontFamilies.regular, 16, 22),
  bodyStrong: variant(fontFamilies.semibold, 16, 22),
  label: variant(fontFamilies.semibold, 15, 20),
  caption: variant(fontFamilies.regular, 13, 18),
  button: variant(fontFamilies.semibold, 18, 22),
  code: variant(fontFamilies.bold, 24, 30),
  plate: variant(fontFamilies.bold, 48, 56),
  mono: variant(fontFamilies.mono, 15, 20),
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
