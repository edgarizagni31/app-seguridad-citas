import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useEntryConfirmedViewModel } from '../view-models/use-entry-confirmed-view-model';
import { UserHeader } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  ASSETS,
  Banner,
  Button,
  colors,
  Icon,
  radius,
  Screen,
  spacing,
  StatusChip,
} from '@/shared/ui';

const { entry: TEXT } = STRINGS;

export function EntryConfirmedScreen() {
  const vm = useEntryConfirmedViewModel();
  if (!vm.record) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <UserHeader roleLabel={STRINGS.session.securityRole} />
        <View style={styles.hero}>
          <View style={styles.check}>
            <Icon name="check-bold" size={56} color={colors.success} />
          </View>
          <AppText variant="title" align="center" role="heading">
            {TEXT.confirmedTitle}
          </AppText>
          <AppText align="center" color={colors.textMuted}>
            {TEXT.confirmedMessage}
          </AppText>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Icon name="alarm-check" color={colors.success} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{vm.time}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {TEXT.recordCompleted}
              </AppText>
            </View>
          </View>
          {vm.visitors.map((visitor) => (
            <View key={visitor.id} style={styles.row}>
              <View style={styles.avatar}>
                <Icon name="account" color={colors.text} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{visitor.name}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {TEXT.roles[visitor.role]}
                </AppText>
              </View>
              <StatusChip
                label={visitor.status === 'arrived' ? TEXT.entered : TEXT.notArrived}
                tone={visitor.status === 'arrived' ? 'success' : 'danger'}
              />
            </View>
          ))}
          <View style={[styles.row, styles.vehicle]}>
            <Image
              source={ASSETS.vehiclePhoto}
              style={styles.photo}
              contentFit="cover"
              aria-hidden
            />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{vm.record.plate}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {vm.record.carrierName}
              </AppText>
            </View>
            <StatusChip label={TEXT.pendingInspection} tone="warning" icon="clock-outline" />
          </View>
        </View>

        <Banner tone="info" message={vm.pendingSync ? TEXT.pendingSync : TEXT.hseInfo} />
      </ScrollView>
      <View style={styles.footer}>
        <Button label={TEXT.backHome} size="lg" onPress={vm.backHome} />
        {/* Seguridad puede inspeccionar de forma opcional (RF-A4) */}
        <Button
          label={`${TEXT.inspect} ${TEXT.optional}`}
          icon="truck-outline"
          variant="outline"
          onPress={vm.inspect}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  check: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.successTint,
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  vehicle: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  photo: { width: 64, height: 52, borderRadius: radius.sm },
  footer: { padding: spacing.md, gap: spacing.sm },
});
