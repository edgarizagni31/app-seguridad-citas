import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BoardVehicle } from '../../domain';
import { InspectionStatusChip } from './inspection-status-chip';
import { STRINGS } from '@/shared/lib';
import { AppText, ASSETS, colors, Icon, radius, spacing } from '@/shared/ui';

type VehicleRowProps = {
  vehicle: BoardVehicle;
  enteredTime: string;
  onPress: () => void;
};

export function VehicleRow({ vehicle, enteredTime, onPress }: VehicleRowProps) {
  return (
    <Pressable
      role="button"
      aria-label={`${vehicle.plate}, ${STRINGS.inspections.status[vehicle.status]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={ASSETS.vehiclePhoto} style={styles.photo} contentFit="cover" aria-hidden />
      <View style={styles.texts}>
        <AppText variant="bodyStrong">{vehicle.plate}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {STRINGS.inspections.enteredAt(enteredTime)}
        </AppText>
      </View>
      <InspectionStatusChip status={vehicle.status} />
      <Icon name="chevron-right" color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  photo: { width: 56, height: 44, borderRadius: radius.sm },
  texts: { flex: 1, gap: 1 },
  pressed: { opacity: 0.7 },
});
