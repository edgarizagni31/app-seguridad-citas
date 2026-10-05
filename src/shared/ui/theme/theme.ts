import { colors } from './colors';
import { radius, shadows, sizes, spacing } from './tokens';
import { fontFamilies, typography } from './typography';

export const theme = { colors, spacing, radius, sizes, shadows, typography, fontFamilies } as const;

export type Theme = typeof theme;

// Hook para poder introducir tema oscuro sin cambiar los consumidores
export const useTheme = (): Theme => theme;
