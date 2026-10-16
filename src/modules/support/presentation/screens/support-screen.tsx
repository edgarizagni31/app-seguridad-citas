import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useSupportViewModel } from '../view-models/use-support-view-model';
import type { OutboxStatus } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  Card,
  colors,
  EmptyState,
  IconButton,
  radius,
  Screen,
  spacing,
  StatusChip,
  type ChipTone,
  type IconName,
} from '@/shared/ui';

const { support: TEXT } = STRINGS;

const STATUS_CHIP: Record<OutboxStatus, { tone: ChipTone; icon: IconName }> = {
  pending: { tone: 'warning', icon: 'clock-outline' },
  in_flight: { tone: 'info', icon: 'cloud-upload-outline' },
  failed: { tone: 'danger', icon: 'alert-circle-outline' },
};

export function SupportScreen() {
  const router = useRouter();
  const vm = useSupportViewModel();
  const empty = vm.queue.length === 0 && vm.rejected.length === 0;

  return (
    <Screen>
      <View style={styles.bar}>
        <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={() => router.back()} />
        <AppText variant="bodyStrong" role="heading" style={styles.flex}>
          {TEXT.title}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText color={colors.textMuted}>{TEXT.subtitle}</AppText>

        <View style={styles.counts}>
          <Count label={TEXT.queued} value={vm.counts.queued} color={colors.warning} />
          <Count label={TEXT.failed} value={vm.counts.failed} color={colors.danger} />
          <Count label={TEXT.rejected} value={vm.counts.rejected} color={colors.danger} />
        </View>

        {vm.offline && <Banner tone="warning" message={TEXT.offline} />}
        {vm.failed && <Banner tone="error" message={TEXT.actionFailed} />}

        <Button
          label={TEXT.syncAll}
          icon="sync"
          size="lg"
          loading={vm.syncing}
          disabled={vm.queue.length === 0}
          onPress={vm.syncAll}
        />

        <Button
          label={TEXT.openDatabase}
          icon="database-search-outline"
          variant="outline"
          onPress={() => router.push('/support/database')}
        />

        {vm.loading && <ActivityIndicator color={colors.primary} />}
        {!vm.loading && empty && (
          <View style={styles.empty}>
            <EmptyState
              icon="cloud-check-outline"
              title={TEXT.emptyTitle}
              message={TEXT.emptyMessage}
            />
          </View>
        )}

        {vm.queue.length > 0 && (
          <View style={styles.section}>
            <AppText variant="bodyStrong" role="heading">
              {TEXT.queueTitle}
            </AppText>
            {vm.queue.map((item) => (
              <Card key={item.id}>
                <View style={styles.header}>
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {item.title}
                  </AppText>
                  <StatusChip label={item.statusLabel} {...STATUS_CHIP[item.status]} />
                </View>
                <AppText variant="caption" color={colors.textMuted}>
                  {item.savedAt} · {item.attempts}
                </AppText>
                {item.lastError && (
                  <View>
                    <AppText variant="caption" color={colors.textMuted}>
                      {TEXT.lastError}
                    </AppText>
                    <AppText>{item.lastError}</AppText>
                  </View>
                )}
                <Button
                  label={TEXT.syncItem}
                  icon="cloud-upload-outline"
                  variant="outline"
                  disabled={item.status === 'in_flight'}
                  onPress={() => vm.syncItem(item.id)}
                />
              </Card>
            ))}
          </View>
        )}

        {vm.rejected.length > 0 && (
          <View style={styles.section}>
            <AppText variant="bodyStrong" role="heading">
              {TEXT.rejectedTitle}
            </AppText>
            {vm.rejected.map((item) => (
              <View key={item.id} style={styles.rejected}>
                <AppText variant="bodyStrong">{item.title}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {item.savedAt}
                </AppText>
                <View>
                  <AppText variant="caption" color={colors.textMuted}>
                    {TEXT.reason}
                  </AppText>
                  <AppText>{item.reason}</AppText>
                </View>
                {item.canResend ? (
                  <Button
                    label={TEXT.resend}
                    icon="send"
                    variant="outline"
                    onPress={() => vm.resend(item.id)}
                  />
                ) : (
                  <AppText variant="caption" color={colors.textMuted}>
                    {TEXT.cannotResend}
                  </AppText>
                )}
                <Button
                  label={TEXT.dismiss}
                  icon="delete-outline"
                  variant="text"
                  onPress={() => vm.dismiss(item.id)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

type CountProps = { label: string; value: number; color: string };

function Count({ label, value, color }: CountProps) {
  return (
    <View style={styles.count} aria-label={`${label}: ${value}`}>
      <AppText variant="title" color={value > 0 ? color : colors.textMuted}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  content: { padding: spacing.md, gap: spacing.md },
  counts: { flexDirection: 'row', gap: spacing.sm },
  count: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  empty: { paddingVertical: spacing.xl },
  section: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rejected: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerTint,
  },
});
