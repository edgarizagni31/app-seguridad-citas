import { StyleSheet, View } from 'react-native';

import { useSignOut } from '../hooks/use-sign-out';
import { STRINGS } from '@/shared/lib';
import { Button, EmptyState, Screen, spacing } from '@/shared/ui';

export function AccessDeniedScreen() {
  const signOut = useSignOut();

  return (
    <Screen>
      <View style={styles.center}>
        <EmptyState
          icon="shield-lock-outline"
          title={STRINGS.accessDenied.title}
          message={STRINGS.accessDenied.message}
        >
          <View style={styles.action}>
            <Button
              label={STRINGS.session.logout}
              variant="outline"
              icon="logout"
              onPress={() => void signOut()}
            />
          </View>
        </EmptyState>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.lg },
});
