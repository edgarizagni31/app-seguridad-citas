import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';
import { AppText, colors, Icon, radius, sizes, spacing } from '@/shared/ui';

const COPIED_FEEDBACK_MS = 2000;

type RawContentBoxProps = { value: string };

export function RawContentBox({ value }: RawContentBoxProps) {
  const { logger } = useDependencies();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    Clipboard.setStringAsync(value)
      .then(() => setCopied(true))
      .catch((error: unknown) => logger.warn('No se pudo copiar el contenido', { error }));
  };

  const label = copied ? STRINGS.common.copied : STRINGS.common.copy;

  return (
    <View style={styles.container}>
      <AppText variant="label">{STRINGS.scanResult.rawContent}</AppText>
      <View style={styles.box}>
        <AppText variant="mono" selectable style={styles.value}>
          {value}
        </AppText>
        <Pressable role="button" aria-label={label} onPress={copy} style={styles.copy}>
          <Icon name={copied ? 'check-circle' : 'content-copy'} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted} aria-live="polite">
            {label}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.inputBackground,
    paddingLeft: spacing.md,
  },
  value: { flex: 1, paddingVertical: spacing.sm },
  copy: {
    minWidth: sizes.touchTarget + spacing.md,
    minHeight: sizes.touchTarget + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
});
