import { StyleSheet, View } from 'react-native';

import { GateHeader } from '../components/gate-header';
import { STRINGS } from '@/shared/lib';
import { ASSETS, Button, EmptyState, HeroImage, Screen, spacing } from '@/shared/ui';

const ILLUSTRATION_ASPECT_RATIO = 602 / 345;

export function HomeScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <GateHeader />
        <HeroImage source={ASSETS.heroGate} rounded style={styles.banner} />
        <View style={styles.body}>
          <EmptyState
            image={ASSETS.illustrationScanEmpty}
            imageAspectRatio={ILLUSTRATION_ASPECT_RATIO}
            title={STRINGS.home.emptyTitle}
            message={STRINGS.home.emptyMessage}
          />
        </View>
        <Button label={STRINGS.home.scan} icon="qrcode-scan" size="lg" onPress={() => undefined} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  banner: { height: 150 },
  body: { flex: 1, justifyContent: 'center' },
});
