import { colors } from './colors';
import { fontFamilies } from './typography';

// Estilo de la barra inferior de pestañas, igual al mockup HSE
export const tabBarTheme = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarActiveBackgroundColor: colors.primaryTint,
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
  tabBarLabelStyle: { fontFamily: fontFamilies.semibold, fontSize: 12 },
} as const;
