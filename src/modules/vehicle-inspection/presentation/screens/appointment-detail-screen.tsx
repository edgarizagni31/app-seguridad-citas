import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { BoardVehicle } from '../../domain';
import { InspectionStatusChip } from '../components/inspection-status-chip';
import { InspectionTopBar } from '../components/inspection-top-bar';
import { useBoard } from '../view-models/use-board';
import { useDependencies } from '@/core/di';
import { formatTime, STRINGS } from '@/shared/lib';
import {
  AppText,
  ASSETS,
  Button,
  colors,
  EmptyState,
  Icon,
  ProgressBar,
  radius,
  Screen,
  shadows,
  spacing,
  type IconName,
} from '@/shared/ui';

const { inspections: TEXT, inspection: INSPECTION } = STRINGS;

export function AppointmentDetailScreen() {
  const router = useRouter();
  const { config } = useDependencies();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { board } = useBoard();
  const appointment = board?.appointments.find((item) => item.id === appointmentId);
  const time = (iso: string) => formatTime(new Date(iso), config.timeZone);
  const open = (vehicle: BoardVehicle) =>
    router.push({ pathname: '/inspection/[vehicleId]', params: { vehicleId: vehicle.id } });

  return (
    <Screen>
      <View style={styles.bar}>
        <InspectionTopBar
          title={
            appointment
              ? TEXT.appointment.title(time(appointment.windowStart), time(appointment.windowEnd))
              : ''
          }
          onBack={() => router.back()}
        />
      </View>
      {!appointment ? (
        board && (
          <EmptyState
            icon="calendar-remove"
            title={TEXT.title}
            message={TEXT.appointment.notFound}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <View style={styles.summaryTexts}>
              <View style={styles.row}>
                <Icon name="warehouse" color={colors.text} />
                <AppText variant="heading">{appointment.clientName}</AppText>
              </View>
              <Detail
                icon="file-document-outline"
                label={INSPECTION.voucher}
                value={appointment.voucherCode}
              />
              <Detail icon="map-marker-outline" value={board?.siteName ?? ''} />
              <Detail
                icon="account-group-outline"
                value={TEXT.appointment.visitorsEntered(appointment.enteredVisitors)}
              />
            </View>
          </View>

          <AppText variant="bodyStrong" role="heading">
            {TEXT.appointment.vehicles(appointment.vehicles.length)}
          </AppText>
          {appointment.vehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicle}>
              <View style={styles.row}>
                <Image
                  source={ASSETS.vehiclePhoto}
                  style={styles.photo}
                  contentFit="cover"
                  aria-hidden
                />
                <View style={styles.vehicleTexts}>
                  <AppText variant="heading">{vehicle.plate}</AppText>
                  <Detail icon="warehouse" value={appointment.clientName} />
                  <Detail icon="clock-outline" value={TEXT.enteredAt(time(vehicle.enteredAt))} />
                </View>
              </View>
              {vehicle.progress ? (
                <View style={styles.progress}>
                  <View style={styles.progressLabels}>
                    <AppText variant="caption">
                      {INSPECTION.stepOf(vehicle.progress.position, vehicle.progress.total)}
                    </AppText>
                    <AppText variant="caption">
                      {TEXT.start.progress(vehicle.progress.percent)}
                    </AppText>
                  </View>
                  <ProgressBar
                    value={vehicle.progress.percent / 100}
                    label={INSPECTION.stepOf(vehicle.progress.position, vehicle.progress.total)}
                  />
                </View>
              ) : (
                <InspectionStatusChip status={vehicle.status} />
              )}
              {vehicle.status === 'pending' && (
                <Button
                  label={TEXT.start.title}
                  icon="file-document-edit-outline"
                  onPress={() => open(vehicle)}
                />
              )}
              {vehicle.status === 'in_progress' && (
                <Button
                  label={TEXT.start.continue}
                  icon="play-circle-outline"
                  variant="outline"
                  onPress={() => open(vehicle)}
                />
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function Detail({ icon, label, value }: { icon: IconName; label?: string; value: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={colors.textMuted} />
      <View>
        {label && (
          <AppText variant="caption" color={colors.textMuted}>
            {label}
          </AppText>
        )}
        <AppText variant="caption">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  content: { padding: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  summary: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  summaryTexts: { gap: spacing.sm },
  vehicle: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  photo: { width: 96, height: 72, borderRadius: radius.md },
  vehicleTexts: { flex: 1, gap: 2 },
  progress: { gap: spacing.xxs },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
});
