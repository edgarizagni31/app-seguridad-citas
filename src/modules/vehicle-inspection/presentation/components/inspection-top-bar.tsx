import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, IconButton, spacing } from '@/shared/ui';

type InspectionTopBarProps = {
  title: string;
  onBack: () => void;
  onClose?: () => void;
};

export function InspectionTopBar({ title, onBack, onClose }: InspectionTopBarProps) {
  return (
    <View style={styles.bar}>
      <IconButton icon="arrow-left" label={STRINGS.inspection.back} onPress={onBack} />
      <AppText variant="bodyStrong" role="heading" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {onClose ? (
        <IconButton icon="close" label={STRINGS.inspection.close} onPress={onClose} />
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  spacer: { width: 48 },
});
