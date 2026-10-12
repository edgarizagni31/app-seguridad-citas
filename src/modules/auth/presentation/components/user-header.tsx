import { StyleSheet, View } from 'react-native';

import { useCurrentUser } from '../hooks/use-current-user';
import { useSignOutPrompt } from '../hooks/use-sign-out-prompt';
import { STRINGS } from '@/shared/lib';
import { AppText, Avatar, colors, IconButton, RoleChip, spacing } from '@/shared/ui';

// Con subtitle, el chip del rol va a la derecha como en el mockup HSE
type UserHeaderProps = { roleLabel: string; subtitle?: string };

export function UserHeader({ roleLabel, subtitle }: UserHeaderProps) {
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
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : (
          <RoleChip label={roleLabel} />
        )}
      </View>
      {subtitle && <RoleChip label={roleLabel} />}
      <IconButton icon="logout" label={STRINGS.session.logout} onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: spacing.xxs },
});
