import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useInspectionResult, type ResultState } from '../view-models/use-inspection-result';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Button,
  colors,
  Icon,
  ProgressBar,
  radius,
  Screen,
  spacing,
  type IconName,
} from '@/shared/ui';

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
    case 'sent':
      return {
        icon: 'check-bold',
        color: colors.success,
        background: colors.successTint,
        title: TEXT.sentTitle,
        message: TEXT.sentMessage,
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
    case 'uploading':
      return {
        icon: 'cloud-upload-outline',
        color: colors.info,
        background: colors.infoTint,
        title: TEXT.sending,
        message: TEXT.uploading(state.done, state.total),
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
      <View style={styles.content}>
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
        {vm.state.type === 'uploading' && (
          <View style={styles.progress}>
            <ProgressBar value={vm.state.done / vm.state.total} label={view.message} />
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Button label={TEXT.backToList} size="lg" onPress={vm.backToList} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  content: {
    flex: 1,
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
  progress: { alignSelf: 'stretch', marginTop: spacing.sm },
  footer: { padding: spacing.md },
});
