import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ConfirmEntrySheet } from '../components/confirm-entry-sheet';
import { VehicleCard } from '../components/vehicle-card';
import { VisitorRow } from '../components/visitor-row';
import { useVisitorsViewModel } from '../view-models/use-visitors-view-model';
import { UserHeader } from '@/modules/auth';
import { useDependencies } from '@/core/di';
import { formatTime, STRINGS } from '@/shared/lib';
import { AppText, Banner, Button, colors, Screen, spacing } from '@/shared/ui';

const { entry: TEXT } = STRINGS;

export function VisitorsScreen() {
  const vm = useVisitorsViewModel();
  const { config } = useDependencies();
  if (!vm.draft || !vm.summary) return <Redirect href="/" />;

  const { draft, summary } = vm;
  const time = (iso: string) => formatTime(new Date(iso), config.timeZone);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <UserHeader roleLabel={STRINGS.session.securityRole} />
        <AppText variant="heading" role="heading">
          {TEXT.visitorsTitle}
        </AppText>
        <VehicleCard draft={draft} />
        {draft.mode === 'late-arrival' && <Banner tone="info" message={TEXT.lateArrivalHint} />}
        {vm.checkedBy === 'local' && <Banner tone="warning" message={TEXT.offlineValidated} />}

        <AppText variant="bodyStrong" role="heading">
          {TEXT.expectedVisitors(draft.visitors.length)}
        </AppText>
        {draft.visitors.map((visitor) => (
          <VisitorRow
            key={visitor.id}
            visitor={visitor}
            enteredTime={visitor.enteredAt ? time(visitor.enteredAt) : null}
            checking={vm.checking === visitor.id}
            onMark={(status) => vm.mark(visitor.id, status)}
          />
        ))}
        <Button label={TEXT.addVisitor} icon="plus" variant="outline" onPress={vm.addVisitor} />
        {summary.pending > 0 && <Banner tone="info" message={TEXT.markHint} />}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={summary.canConfirm ? TEXT.confirmCount(summary.entering) : TEXT.confirm}
          size="lg"
          disabled={!summary.canConfirm}
          onPress={vm.openConfirm}
        />
      </View>
      <ConfirmEntrySheet
        visible={vm.confirmOpen}
        entering={summary.entering}
        notArriving={summary.notArriving}
        saving={vm.saving}
        error={vm.saveError}
        onConfirm={vm.confirm}
        onCancel={vm.closeConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
