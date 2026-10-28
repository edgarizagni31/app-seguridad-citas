import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { GatePerson } from '../../domain';
import { STRINGS } from '@/shared/lib';
import { AppText, Avatar, colors, Icon, radius, spacing, StatusChip } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

type PersonRowProps = {
  person: GatePerson;
  arrived: boolean;
  onPress?: () => void;
  // Reemplaza la etiqueta Llegó/Pendiente (por ejemplo, el selector de acompañantes)
  trailing?: ReactNode;
};

export function PersonRow({ person, arrived, onPress, trailing }: PersonRowProps) {
  const statusLabel = TEXT.visitorStatus[person.status] ?? person.status;
  const chip = !person.enabled ? (
    <StatusChip label={statusLabel} tone="neutral" icon="cancel" />
  ) : arrived ? (
    <StatusChip label={TEXT.arrived} tone="success" icon="check-circle" />
  ) : (
    <StatusChip label={TEXT.pending} tone="danger" icon="alert-circle" />
  );

  return (
    <Pressable
      role={onPress ? 'button' : undefined}
      aria-label={`${person.name}, ${person.enabled ? (arrived ? TEXT.arrived : TEXT.pending) : statusLabel}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        arrived && person.enabled && styles.arrived,
        !person.enabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Avatar name={person.name} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{person.name}</AppText>
        {person.documentNumber && (
          <AppText variant="caption" color={colors.textMuted}>
            {person.documentNumber}
          </AppText>
        )}
      </View>
      {trailing ?? chip}
      {onPress && <Icon name="chevron-right" color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  arrived: { borderColor: colors.success, backgroundColor: colors.successTint },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
});
