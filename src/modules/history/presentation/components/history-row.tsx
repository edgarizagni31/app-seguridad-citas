import { StyleSheet, View } from 'react-native';

import type { HistoryRow } from '../view-models/use-history-view-model';
import type { RecordSyncStatus } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';
import { AppText, Card, colors, Icon, radius, spacing, type IconName } from '@/shared/ui';

const { history: TEXT } = STRINGS;

const STATUS_STYLE: Record<
  RecordSyncStatus,
  { color: string; background: string; icon: IconName }
> = {
  pending: { color: colors.warning, background: colors.warningTint, icon: 'cloud-upload-outline' },
  synced: { color: colors.success, background: colors.successTint, icon: 'cloud-check-outline' },
  rejected: { color: colors.danger, background: colors.dangerTint, icon: 'alert-circle-outline' },
};

export function HistoryRowItem({ row }: { row: HistoryRow }) {
  const status = STATUS_STYLE[row.syncStatus];
  const kindIcon: IconName =
    row.kind === 'entry' ? 'account-multiple-check' : 'clipboard-check-outline';

  return (
    <Card style={styles.card}>
      <Icon name={kindIcon} color={colors.primaryText} />
      <View style={styles.texts}>
        <AppText variant="caption" color={colors.textMuted}>
          {`${TEXT.kinds[row.kind]} · ${row.time}`}
        </AppText>
        <AppText variant="bodyStrong">{row.title}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {row.subtitle}
        </AppText>
      </View>
      <View style={[styles.badge, { backgroundColor: status.background }]}>
        <Icon name={status.icon} size={16} color={status.color} />
        <AppText variant="caption" color={status.color}>
          {TEXT.status[row.syncStatus]}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
