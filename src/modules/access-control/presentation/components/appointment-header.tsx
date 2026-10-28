import { StyleSheet, View } from 'react-native';

import type { GateAppointment } from '../../domain';
import { windowText } from '../mappers/gate-text';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  type ChipTone,
  colors,
  Icon,
  type IconName,
  radius,
  spacing,
  StatusChip,
} from '@/shared/ui';

const { gate: TEXT } = STRINGS;

type AppointmentHeaderProps = { appointment: GateAppointment };

function windowStatus(appointment: GateAppointment): {
  label: string;
  tone: ChipTone;
  icon: IconName;
} {
  if (!appointment.eligible) {
    return { label: TEXT.windowStatus.notEligible, tone: 'danger', icon: 'cancel' };
  }
  return appointment.withinWindow
    ? { label: TEXT.windowStatus.onTime, tone: 'success', icon: 'clock-check-outline' }
    : { label: TEXT.windowStatus.outside, tone: 'warning', icon: 'clock-alert-outline' };
}

// Cliente y Nº de cita, con el estado de la ventana de ingreso
export function AppointmentHeader({ appointment }: AppointmentHeaderProps) {
  const window = windowText(appointment.windowStart, appointment.windowEnd);
  const status = windowStatus(appointment);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.top}>
          <View style={styles.logo}>
            <Icon name="office-building-outline" color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.textMuted}>
              {TEXT.client}
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {appointment.clientName ?? '—'}
            </AppText>
          </View>
          <View style={styles.code}>
            <AppText variant="caption" color={colors.textMuted}>
              {TEXT.appointment}
            </AppText>
            <AppText variant="caption" color={colors.info} numberOfLines={1}>
              {appointment.code}
            </AppText>
          </View>
        </View>
        <View style={styles.bottom}>
          <Icon name="calendar-clock" color={colors.textMuted} size={18} />
          <AppText variant="caption" color={colors.textMuted} style={styles.flex}>
            {window ?? '—'}
          </AppText>
          <StatusChip label={status.label} tone={status.tone} icon={status.icon} />
        </View>
      </View>
      {!appointment.eligible && <Banner tone="error" message={TEXT.notEligible} />}
      {appointment.eligible && !appointment.withinWindow && (
        <Banner tone="warning" message={TEXT.outsideWindow} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: spacing.sm },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.infoTint,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  code: { flex: 1.4 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
