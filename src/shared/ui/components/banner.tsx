import { Pressable, StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';

import { colors, radius, sizes, spacing } from '../theme';
import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type BannerTone = 'error' | 'warning' | 'success' | 'info';

const TONES: Record<BannerTone, { icon: IconName; color: string; background: string }> = {
  error: { icon: 'alert-circle', color: colors.danger, background: colors.dangerTint },
  warning: { icon: 'alert', color: colors.warning, background: colors.warningTint },
  success: { icon: 'check-circle', color: colors.success, background: colors.successTint },
  info: { icon: 'information', color: colors.info, background: colors.infoTint },
};

type BannerProps = {
  tone: BannerTone;
  message: string;
  title?: string;
  onDismiss?: () => void;
};

export function Banner({ tone, message, title, onDismiss }: BannerProps) {
  const { icon, color, background } = TONES[tone];
  const urgent = tone === 'error' || tone === 'warning';

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View
        accessible
        role={urgent ? 'alert' : 'status'}
        aria-live={urgent ? 'assertive' : 'polite'}
        style={styles.content}
      >
        <Icon name={icon} color={color} />
        <View style={styles.texts}>
          {title && (
            <AppText variant="bodyStrong" color={color}>
              {title}
            </AppText>
          )}
          <AppText color={color}>{message}</AppText>
        </View>
      </View>
      {onDismiss && (
        <Pressable
          role="button"
          aria-label={STRINGS.common.close}
          onPress={onDismiss}
          hitSlop={spacing.xs}
          style={styles.dismiss}
        >
          <Icon name="close" color={color} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: spacing.xxs },
  dismiss: {
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
