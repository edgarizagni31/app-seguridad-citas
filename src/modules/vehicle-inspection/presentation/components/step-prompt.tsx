import { StyleSheet, View } from 'react-native';

import { AppText, colors, Icon, radius, spacing } from '@/shared/ui';

type StepPromptProps = {
  title?: string;
  prompt: string;
  // Insignia de la trama, ej. "Porque respondiste Sí"
  badge?: string;
};

// Texto del paso con la barra verde a la izquierda, como en el mockup
export function StepPrompt({ title, prompt, badge }: StepPromptProps) {
  return (
    <View style={styles.container}>
      {badge && (
        <View style={styles.because}>
          <Icon name="check-circle" size={18} color={colors.success} />
          <AppText variant="caption" color={colors.success}>
            {badge}
          </AppText>
        </View>
      )}
      <View style={styles.accent}>
        {title && (
          <AppText variant="heading" role="heading">
            {title}
          </AppText>
        )}
        <AppText color={title ? colors.textMuted : colors.text}>{prompt}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  because: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.successTint,
  },
  accent: {
    gap: spacing.xxs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
});
