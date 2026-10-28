import { StyleSheet, View } from 'react-native';

import type { GateAppointment } from '../../domain';
import { windowText } from '../mappers/gate-text';
import { STRINGS } from '@/shared/lib';
import { AppText, Banner, colors, Icon, radius, spacing } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

type AppointmentHeaderProps = { appointment: GateAppointment };

// Cliente y Nº de cita, con los avisos de elegibilidad y de ventana
export function AppointmentHeader({ appointment }: AppointmentHeaderProps) {
  const window = windowText(appointment.windowStart, appointment.windowEnd);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Icon name="office-building-outline" color={colors.danger} />
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.textMuted}>
            {TEXT.client}
          </AppText>
          <AppText variant="bodyStrong">{appointment.clientName ?? '—'}</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.textMuted}>
            {TEXT.appointment}
          </AppText>
          <AppText variant="caption" color={colors.primaryText} numberOfLines={1}>
            {appointment.code}
          </AppText>
          {window && (
            <AppText variant="caption" color={colors.textMuted}>
              {window}
            </AppText>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.infoTint,
  },
});
