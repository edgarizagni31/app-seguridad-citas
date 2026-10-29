import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useInspectionResult, type ResultState } from '../view-models/use-inspection-result';
import { STRINGS } from '@/shared/lib';
import { AppText, Button, colors, Icon, radius, Screen, spacing, type IconName } from '@/shared/ui';

const { result: TEXT } = STRINGS.inspection;

type ResultView = {
  icon: IconName;
  color: string;
  background: string;
  title: string;
  message: string;
};

function describe(state: Exclude<ResultState, { type: 'loading' }>): ResultView {
  switch (state.type) {
    case 'compliant':
      return {
        icon: 'check-bold',
        color: colors.success,
        background: colors.successTint,
        title: TEXT.compliantTitle,
        message: TEXT.compliantMessage,
      };
    case 'non-compliant':
      return {
        icon: 'alert',
        color: colors.danger,
        background: colors.dangerTint,
        title: state.observed ? TEXT.observedTitle : TEXT.nonCompliantTitle,
        message: state.observed ? TEXT.observedMessage : TEXT.nonCompliantMessage,
      };
    case 'observed':
      return {
        icon: 'alert',
        color: colors.warning,
        background: colors.warningTint,
        title: TEXT.observedTitle,
        message: TEXT.observedMessage,
      };
    case 'rejected':
      return {
        icon: 'close-thick',
        color: colors.danger,
        background: colors.dangerTint,
        title: TEXT.rejectedTitle,
        message: state.message ?? STRINGS.common.unexpectedError,
      };
    case 'sending':
      return {
        icon: 'cloud-upload-outline',
        color: colors.info,
        background: colors.infoTint,
        title: TEXT.sending,
        message: TEXT.sendingMessage,
      };
    case 'pending':
      return {
        icon: 'cloud-clock-outline',
        color: colors.info,
        background: colors.infoTint,
        title: TEXT.pendingTitle,
        message: TEXT.pendingMessage,
      };
  }
}

export function InspectionResultScreen() {
  const vm = useInspectionResult();
  if (vm.state.type === 'loading') {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </Screen>
    );
  }
  const view = describe(vm.state);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.icon, { backgroundColor: view.background }]}>
          <Icon name={view.icon} size={56} color={view.color} />
        </View>
        <AppText variant="heading" align="center">
          {vm.plate}
        </AppText>
        <AppText variant="title" align="center" role="heading">
          {view.title}
        </AppText>
        <AppText align="center" color={colors.textMuted}>
          {view.message}
        </AppText>
        {vm.state.type === 'sending' && <ActivityIndicator color={colors.info} />}
        {vm.state.type === 'non-compliant' && vm.state.controls.length > 0 && (
          <View style={styles.controls}>
            <AppText variant="bodyStrong" role="heading">
              {TEXT.nonCompliantList}
            </AppText>
            {vm.state.controls.map((control) => (
              <View key={control} style={styles.control}>
                <Icon name="close-circle" color={colors.danger} size={20} />
                <AppText style={styles.flex}>{control}</AppText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={TEXT.backToList} size="lg" onPress={vm.backToList} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: spacing.xl },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  icon: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  controls: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerTint,
  },
  control: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: { padding: spacing.md },
});
