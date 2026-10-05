import { StyleSheet, View } from 'react-native';

import type { ScanResultView } from '../mappers/scan-result-view';
import {
  AppText,
  colors,
  Icon,
  radius,
  shadows,
  sizes,
  spacing,
  type BannerTone,
} from '@/shared/ui';

import { PlateChip } from './plate-chip';
import { RawContentBox } from './raw-content-box';

const TONES: Record<BannerTone, { tint: string; strong: string; text: string }> = {
  success: { tint: colors.primaryTint, strong: colors.primary, text: colors.primaryText },
  info: { tint: colors.infoTint, strong: colors.info, text: colors.info },
  warning: { tint: colors.warningTint, strong: colors.warning, text: colors.warning },
  error: { tint: colors.dangerTint, strong: colors.danger, text: colors.danger },
};

type ScanResultCardProps = { view: ScanResultView };

export function ScanResultCard({ view }: ScanResultCardProps) {
  const tone = TONES[view.tone];

  return (
    <View style={styles.card}>
      <View style={[styles.header, { backgroundColor: tone.tint }]}>
        <View style={[styles.tile, { backgroundColor: tone.strong }]}>
          <Icon name={view.icon} color={colors.textOnDark} />
        </View>
        <AppText variant="heading" color={tone.text} role="heading" style={styles.title}>
          {view.title}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {view.readAt}
        </AppText>
      </View>
      <View style={styles.body}>
        {view.fields.map((field) => (
          <View key={field.label} style={styles.field}>
            <AppText color={colors.textMuted}>{field.label}</AppText>
            {field.display === 'plate' ? (
              <PlateChip plate={field.value} />
            ) : (
              <AppText variant="code" selectable>
                {field.value}
              </AppText>
            )}
          </View>
        ))}
        <RawContentBox value={view.raw} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  tile: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  body: { padding: spacing.md, gap: spacing.md },
  field: { gap: spacing.xxs },
});
