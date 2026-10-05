import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '../theme';

type ScreenProps = {
  children: ReactNode;
  edges?: readonly Edge[];
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  edges = ['top', 'bottom'],
  backgroundColor = colors.background,
  style,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.container, { backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
