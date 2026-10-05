import { ScrollView, StyleSheet, View } from 'react-native';

import { GateHeader } from '../components/gate-header';
import { ScanResultCard } from '../components/scan-result-card';
import { useHomeViewModel } from '../view-models/use-home-view-model';
import { STRINGS } from '@/shared/lib';
import { ASSETS, Banner, Button, EmptyState, HeroImage, Screen, spacing } from '@/shared/ui';

const ILLUSTRATION_ASPECT_RATIO = 602 / 345;

export function HomeScreen() {
  const vm = useHomeViewModel();

  return (
    <Screen>
      <View style={styles.header}>
        <GateHeader />
      </View>
      {vm.result ? (
        <ScrollView contentContainerStyle={styles.result}>
          <ScanResultCard view={vm.result} />
          <Banner tone={vm.result.tone} message={vm.result.note} />
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <HeroImage source={ASSETS.heroGate} rounded style={styles.banner} />
          <View style={styles.emptyBody}>
            <EmptyState
              image={ASSETS.illustrationScanEmpty}
              imageAspectRatio={ILLUSTRATION_ASPECT_RATIO}
              title={STRINGS.home.emptyTitle}
              message={STRINGS.home.emptyMessage}
            />
          </View>
        </View>
      )}
      <View style={styles.footer}>
        <Button
          label={vm.result ? STRINGS.home.scanAnother : STRINGS.home.scan}
          icon="qrcode-scan"
          size="lg"
          onPress={vm.openScanner}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  result: { padding: spacing.md, gap: spacing.md },
  empty: { flex: 1, padding: spacing.md, gap: spacing.md },
  banner: { height: 150 },
  emptyBody: { flex: 1, justifyContent: 'center' },
  footer: { padding: spacing.md },
});
