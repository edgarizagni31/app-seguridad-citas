import { Pressable, StyleSheet, View } from 'react-native';

import type { BoardAppointment, BoardVehicle } from '../../domain';
import { VehicleRow } from './vehicle-row';
import { STRINGS } from '@/shared/lib';
import { AppText, colors, Icon, radius, shadows, spacing } from '@/shared/ui';

const { inspections: TEXT, inspection: INSPECTION } = STRINGS;

type AppointmentCardProps = {
  appointment: BoardAppointment;
  vehicles: readonly BoardVehicle[];
  time: (iso: string) => string;
  isLast: boolean;
  onOpenAppointment: () => void;
  onOpenVehicle: (vehicle: BoardVehicle) => void;
};

// Cita en la línea de tiempo del mockup HSE: cliente, voucher, horario y sus vehículos
export function AppointmentCard({
  appointment,
  vehicles,
  time,
  isLast,
  onOpenAppointment,
  onOpenVehicle,
}: AppointmentCardProps) {
  return (
    <View style={styles.item}>
      <View style={styles.timeline} aria-hidden>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.card}>
        <Pressable
          role="button"
          aria-label={`${appointment.clientName}, ${INSPECTION.voucher} ${appointment.voucherCode}`}
          onPress={onOpenAppointment}
          style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        >
          <View style={styles.icon}>
            <Icon name="warehouse" color={colors.text} />
          </View>
          <View style={styles.texts}>
            <AppText variant="bodyStrong">{appointment.clientName}</AppText>
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {`${INSPECTION.voucher}  ${appointment.voucherCode}`}
            </AppText>
            <View style={styles.window}>
              <Icon name="calendar-blank-outline" size={16} color={colors.textMuted} />
              <AppText variant="caption">
                {TEXT.todayWindow(time(appointment.windowStart), time(appointment.windowEnd))}
              </AppText>
            </View>
          </View>
          <Icon name="chevron-right" color={colors.textMuted} />
        </Pressable>
        {vehicles.map((vehicle) => (
          <VehicleRow
            key={vehicle.id}
            vehicle={vehicle}
            enteredTime={time(vehicle.enteredAt)}
            onPress={() => onOpenVehicle(vehicle)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.sm },
  timeline: { width: 14, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    marginTop: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  line: { flex: 1, width: 2, marginTop: spacing.xxs, backgroundColor: colors.primaryTint },
  card: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  texts: { flex: 1, gap: 1 },
  window: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  pressed: { opacity: 0.7 },
});
