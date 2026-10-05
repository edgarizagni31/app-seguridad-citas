import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { STRINGS } from '@/shared/lib';

import { ASSETS } from '../assets';
import { colors, radius, spacing } from '../theme';
import { AppText } from './app-text';
import { HeroImage } from './hero-image';
import { Logo } from './logo';

const TRACK_WIDTH = 240;
const BAR_WIDTH = TRACK_WIDTH * 0.4;

type BrandSplashProps = { version: string };

export function BrandSplash({ version }: BrandSplashProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1),
    );
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * (TRACK_WIDTH + BAR_WIDTH) - BAR_WIDTH }],
  }));

  return (
    <HeroImage source={ASSETS.heroGate} overlay="strong" style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Logo variant="white" width={240} />
        <View style={styles.divider} />
        <AppText variant="display" color={colors.textOnDark} align="center">
          {STRINGS.app.name}
        </AppText>
        <AppText color={colors.textOnDark} align="center">
          {STRINGS.app.subtitle}
        </AppText>
      </View>
      <View style={styles.footer}>
        <View
          accessible
          style={styles.track}
          role="progressbar"
          aria-label={STRINGS.app.loading}
          aria-busy
        >
          <Animated.View style={[styles.bar, barStyle]} />
        </View>
        <AppText variant="caption" color={colors.textOnDark}>
          {version}
        </AppText>
      </View>
    </HeroImage>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  divider: {
    width: 48,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.scannerFrame,
    marginVertical: spacing.sm,
  },
  footer: { alignItems: 'center', gap: spacing.md },
  track: {
    width: TRACK_WIDTH,
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  bar: {
    width: BAR_WIDTH,
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.scannerFrame,
  },
});
