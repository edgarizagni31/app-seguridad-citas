import { Image, type ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type EmptyStateProps = {
  title: string;
  message: string;
  image?: ImageSource;
  imageAspectRatio?: number;
  icon?: IconName;
  children?: ReactNode;
};

export function EmptyState({
  title,
  message,
  image,
  imageAspectRatio = 1,
  icon,
  children,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {image && (
        <Image
          source={image}
          style={[styles.image, { aspectRatio: imageAspectRatio }]}
          contentFit="contain"
          aria-hidden
        />
      )}
      {icon && <Icon name={icon} size={72} color={colors.primary} />}
      <AppText variant="heading" align="center" role="heading">
        {title}
      </AppText>
      <AppText color={colors.textMuted} align="center">
        {message}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  image: { width: '100%', marginBottom: spacing.md },
});
