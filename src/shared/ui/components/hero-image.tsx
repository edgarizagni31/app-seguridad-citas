import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '../theme';

type HeroImageProps = {
  source: ImageSource;
  overlay?: 'none' | 'soft' | 'strong';
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const OVERLAYS = {
  soft: ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)'],
  strong: ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)'],
} as const;

export function HeroImage({
  source,
  overlay = 'none',
  rounded = false,
  style,
  children,
}: HeroImageProps) {
  return (
    <View style={[styles.container, rounded && styles.rounded, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" aria-hidden />
      {overlay !== 'none' && (
        <LinearGradient colors={OVERLAYS[overlay]} style={StyleSheet.absoluteFill} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  rounded: { borderRadius: radius.lg },
});
