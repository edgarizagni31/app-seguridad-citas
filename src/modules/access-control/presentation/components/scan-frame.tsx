import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/shared/ui';

const CORNER = 36;
const STROKE = 5;

// Esquinas del encuadre con una línea de barrido, sin oscurecer la imagen (mockup 1)
export function ScanFrame({ size: frame }: { size: number }) {
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
    <View style={[styles.center, StyleSheet.absoluteFill]} pointerEvents="none">
      <View style={{ width: frame, height: frame }}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <Animated.View style={[styles.line, lineStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
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
