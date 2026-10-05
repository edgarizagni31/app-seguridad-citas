import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { STRINGS } from '@/shared/lib';
import { AppText, colors, radius, spacing } from '@/shared/ui';

const CORNER = 36;
const STROKE = 5;
const MAX_FRAME = 280;

export function ScannerOverlay() {
  const { width } = useWindowDimensions();
  const frame = Math.min(width * 0.72, MAX_FRAME);
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.set(
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [sweep]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.get() * (frame - STROKE) }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.shade} />
      <View style={[styles.middle, { height: frame }]}>
        <View style={styles.shade} />
        <View style={{ width: frame, height: frame }}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Animated.View style={[styles.line, lineStyle]} />
        </View>
        <View style={styles.shade} />
      </View>
      <View style={[styles.shade, styles.hintArea]}>
        <AppText variant="bodyStrong" color={colors.textOnDark} align="center">
          {STRINGS.scanner.hint}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: colors.overlay },
  middle: { flexDirection: 'row' },
  hintArea: { alignItems: 'center', paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.scannerFrame,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: radius.lg,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopRightRadius: radius.lg,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderBottomLeftRadius: radius.lg,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: radius.lg,
  },
  line: {
    position: 'absolute',
    left: spacing.xs,
    right: spacing.xs,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.scannerFrame,
    shadowColor: colors.scannerFrame,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
