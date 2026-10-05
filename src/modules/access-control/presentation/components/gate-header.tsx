import { StyleSheet, View } from 'react-native';

import { useCurrentUser, useSignOut } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import { AppText, Avatar, IconButton, RoleChip, spacing } from '@/shared/ui';

export function GateHeader() {
  const user = useCurrentUser();
  const signOut = useSignOut();
  if (!user) return null;

  return (
    <View style={styles.row}>
      <Avatar name={`${user.firstName} ${user.lastName}`} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" role="heading">
          {STRINGS.session.greeting(user.firstName)}
        </AppText>
        <RoleChip label={STRINGS.session.securityRole} />
      </View>
      <IconButton icon="logout" label={STRINGS.session.logout} onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: spacing.xxs },
});
