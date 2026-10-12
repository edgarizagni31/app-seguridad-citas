import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { ArrivalStatus, EntryVisitor } from '../../domain';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  colors,
  Icon,
  radius,
  SegmentedControl,
  spacing,
  StatusChip,
  type ChipTone,
  type IconName,
} from '@/shared/ui';

const { entry: TEXT } = STRINGS;

type Chip = { label: string; tone: ChipTone; icon?: IconName };

function chipFor(visitor: EntryVisitor, enteredTime: string | null): Chip {
  if (enteredTime) return { label: TEXT.enteredAt(enteredTime), tone: 'success' };
  if (visitor.blockedReason) return { label: TEXT.blacklisted, tone: 'danger', icon: 'cancel' };
  if (visitor.added) return { label: TEXT.added, tone: 'info', icon: 'account-plus-outline' };
  if (visitor.status === 'arrived') return { label: TEXT.arrived, tone: 'success' };
  if (visitor.status === 'not_arrived') return { label: TEXT.notArrived, tone: 'danger' };
  return { label: TEXT.pending, tone: 'warning' };
}

export const documentLabel = (visitor: Pick<EntryVisitor, 'documentType' | 'documentNumber'>) =>
  `${TEXT.documentTypes[visitor.documentType]} ${visitor.documentNumber}`;

type VisitorRowProps = {
  visitor: EntryVisitor;
  // Hora formateada si ya ingresó en una confirmación anterior
  enteredTime: string | null;
  checking: boolean;
  onMark: (status: ArrivalStatus) => void;
};

export function VisitorRow({ visitor, enteredTime, checking, onMark }: VisitorRowProps) {
  const chip = chipFor(visitor, enteredTime);
  const dimmed = visitor.status === 'not_arrived' && !enteredTime;

  return (
    <View style={[styles.row, dimmed && styles.dimmed]}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Icon name="account" color={colors.text} />
        </View>
        <View style={styles.texts}>
          <AppText variant="bodyStrong" color={dimmed ? colors.textMuted : colors.text}>
            {visitor.name}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {TEXT.roles[visitor.role]}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {documentLabel(visitor)}
          </AppText>
        </View>
        {checking ? (
          <ActivityIndicator color={colors.primary} aria-label={TEXT.checkingVisitor} />
        ) : (
          <StatusChip {...chip} />
        )}
      </View>
      {visitor.blockedReason && (
        <AppText variant="caption" color={colors.danger}>
          {visitor.blockedReason}
        </AppText>
      )}
      {!enteredTime && (
        <SegmentedControl
          label={visitor.name}
          size="sm"
          value={visitor.status === 'pending' ? null : visitor.status}
          onChange={onMark}
          options={[
            { value: 'arrived', label: TEXT.arrived, disabled: Boolean(visitor.blockedReason) },
            { value: 'not_arrived', label: TEXT.notArrived, selectedColor: colors.danger },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dimmed: { backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  texts: { flex: 1, gap: 1 },
});
