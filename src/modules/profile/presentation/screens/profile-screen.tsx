import { ScrollView, StyleSheet, View } from 'react-native';

import { useProfileViewModel } from '../view-models/use-profile-view-model';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Avatar,
  Banner,
  Button,
  Card,
  colors,
  Icon,
  type IconName,
  RoleChip,
  Screen,
  sizes,
  spacing,
} from '@/shared/ui';

const { profile: TEXT, sites: SITES } = STRINGS;

export function ProfileScreen() {
  const vm = useProfileViewModel();
  if (!vm.user) return null;

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title" role="heading">
          {TEXT.title}
        </AppText>

        <Card style={styles.userCard}>
          <Avatar name={vm.user.fullName} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{vm.user.fullName}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {vm.user.email}
            </AppText>
          </View>
          {vm.roleLabel && <RoleChip label={vm.roleLabel} />}
        </Card>

        {vm.showShift && (
          <Card>
            <Row icon="warehouse" label={TEXT.site} value={vm.site?.name ?? '—'} />
            {vm.minutesSinceUpdate !== null && (
              <AppText variant="caption" color={colors.textMuted}>
                {SITES.updatedAgo(vm.minutesSinceUpdate)}
              </AppText>
            )}
            {vm.refreshFailed && <Banner tone="warning" message={TEXT.updateFailed} />}
            <Button
              label={SITES.updateData}
              icon="refresh"
              variant="outline"
              loading={vm.refreshing}
              onPress={vm.refresh}
            />
            <Button label={SITES.changeSite} variant="text" onPress={vm.changeSite} />
          </Card>
        )}

        <Card>
          <Row
            icon={vm.pending > 0 ? 'cloud-upload-outline' : 'cloud-check-outline'}
            label={TEXT.sync}
            value={vm.pending > 0 ? TEXT.pending(vm.pending) : TEXT.allSynced}
          />
        </Card>

        {vm.isSupport && (
          <Button
            label={STRINGS.support.open}
            icon="lifebuoy"
            variant="outline"
            onPress={vm.openSupport}
          />
        )}

        <Button
          label={STRINGS.session.logout}
          icon="logout"
          variant="outline"
          onPress={vm.signOut}
        />
      </ScrollView>
    </Screen>
  );
}

type RowProps = { icon: IconName; label: string; value: string };

function Row({ icon, label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Icon name={icon} color={colors.primaryText} size={sizes.icon} />
      <View style={styles.flex}>
        <AppText variant="caption" color={colors.textMuted}>
          {label}
        </AppText>
        <AppText variant="bodyStrong">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  userCard: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
