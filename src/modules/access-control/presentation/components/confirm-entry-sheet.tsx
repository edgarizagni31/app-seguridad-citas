import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, Banner, BottomSheet, Button, colors, Icon, radius, spacing } from '@/shared/ui';

const { entry: TEXT } = STRINGS;

type ConfirmEntrySheetProps = {
  visible: boolean;
  entering: number;
  notArriving: number;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmEntrySheet({
  visible,
  entering,
  notArriving,
  saving,
  error,
  onConfirm,
  onCancel,
}: ConfirmEntrySheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} closeLabel={TEXT.cancel}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Icon name="shield-check-outline" size={40} color={colors.primary} />
        </View>
        <AppText variant="heading" align="center" role="heading">
          {TEXT.confirmTitle}
        </AppText>
        <AppText align="center" color={colors.textMuted}>
          {TEXT.confirmEntering(entering)}
          {notArriving > 0 ? `\n${TEXT.confirmNotArriving(notArriving)}` : ''}
        </AppText>
      </View>
      {error && <Banner tone="error" message={error} />}
      <Button label={TEXT.confirm} size="lg" loading={saving} onPress={onConfirm} />
      <Button label={TEXT.cancel} variant="outline" disabled={saving} onPress={onCancel} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
  icon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    marginBottom: spacing.xs,
  },
});
