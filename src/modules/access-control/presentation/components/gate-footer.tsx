import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, shadows, spacing } from '@/shared/ui';

type GateFooterProps = { children: ReactNode };

// Acciones principales fijas abajo, al alcance del pulgar
export function GateFooter({ children }: GateFooterProps) {
  return <View style={styles.footer}>{children}</View>;
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
});
