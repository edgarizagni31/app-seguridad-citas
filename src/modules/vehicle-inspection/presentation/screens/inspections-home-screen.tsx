import { StyleSheet, View } from 'react-native';

import { UserHeader } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import { AppText, EmptyState, Screen, spacing } from '@/shared/ui';

const { inspections: TEXT } = STRINGS;

export function InspectionsHomeScreen() {
  return (
    <Screen edges={[]}>
      <View style={styles.content}>
        <UserHeader roleLabel={STRINGS.session.hseRole} />
        <AppText variant="title" role="heading">
          {TEXT.title}
        </AppText>
        <View style={styles.empty}>
          <EmptyState icon="clipboard-check-outline" title={TEXT.title} message={TEXT.comingSoon} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  empty: { flex: 1, justifyContent: 'center' },
});
