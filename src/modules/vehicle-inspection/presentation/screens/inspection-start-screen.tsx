import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { Button, EmptyState, Screen, spacing } from '@/shared/ui';

const { inspections: TEXT } = STRINGS;

export function InspectionStartScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  return (
    <Screen>
      <View style={styles.content}>
        <EmptyState icon="clipboard-check-outline" title={TEXT.title} message={TEXT.comingSoon}>
          <View style={styles.actions}>
            <Button label={STRINGS.common.back} variant="outline" onPress={() => router.back()} />
          </View>
        </EmptyState>
      </View>
      {/* vehicleId se usa al iniciar el cuestionario (IV8) */}
      <View accessible={false} testID={`inspection-${vehicleId}`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  actions: { alignSelf: 'stretch', marginTop: spacing.md },
});
