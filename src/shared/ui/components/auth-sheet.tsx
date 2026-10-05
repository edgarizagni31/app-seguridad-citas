import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type AuthSheetProps = { children: ReactNode };

export function AuthSheet({ children }: AuthSheetProps) {
  return <View style={styles.sheet}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    flexGrow: 1,
    marginTop: -radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
});
