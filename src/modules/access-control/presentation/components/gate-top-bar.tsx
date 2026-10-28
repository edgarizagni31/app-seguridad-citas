import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, colors, IconButton, spacing } from '@/shared/ui';

type GateTopBarProps = { title: string; subtitle?: string; leading?: ReactNode };

export function GateTopBar({ title, subtitle, leading }: GateTopBarProps) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={() => router.back()} />
      {leading}
      <View style={styles.flex}>
        <AppText variant="bodyStrong" role="heading">
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
