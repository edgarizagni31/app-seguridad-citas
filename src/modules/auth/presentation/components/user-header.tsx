import { StyleSheet, View } from 'react-native';

import { useCurrentUser } from '../hooks/use-current-user';
import { useSignOutPrompt } from '../hooks/use-sign-out-prompt';
import { STRINGS } from '@/shared/lib';
import { AppText, Avatar, IconButton, RoleChip, spacing } from '@/shared/ui';

type UserHeaderProps = { roleLabel: string };

export function UserHeader({ roleLabel }: UserHeaderProps) {
  const user = useCurrentUser();
  const signOut = useSignOutPrompt();
  if (!user) return null;

  return (
    <View style={styles.row}>
      <Avatar name={`${user.firstName} ${user.lastName}`} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" role="heading">
          {STRINGS.session.greeting(user.firstName)}
        </AppText>
        <RoleChip label={roleLabel} />
      </View>
      <IconButton icon="logout" label={STRINGS.session.logout} onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: spacing.xxs },
});
