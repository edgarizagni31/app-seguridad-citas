import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { REFERENCE_IMAGES } from '../reference-images';
import { STRINGS } from '@/shared/lib';
import { AppText, colors, Icon, radius, spacing } from '@/shared/ui';

const { inspection: TEXT } = STRINGS;

type ReferenceImageProps = {
  stepId: string;
  // URL de la trama; se usa si la app no tiene la imagen local de ese paso
  remoteUri?: string;
  // Foto real ya tomada: reemplaza a la referencial (RF-G5)
  photoUri?: string | null;
  tagged?: boolean;
};

export function ReferenceImage({
  stepId,
  remoteUri,
  photoUri,
  tagged = true,
}: ReferenceImageProps) {
  const reference = REFERENCE_IMAGES[stepId] ?? (remoteUri ? { uri: remoteUri } : undefined);
  if (photoUri) {
    return (
      <View style={styles.frame}>
        <Image
          source={{ uri: photoUri }}
          style={styles.image}
          contentFit="cover"
          aria-label={TEXT.photoTaken}
        />
        <View style={[styles.tag, styles.taken]}>
          <Icon name="check-circle" size={16} color={colors.textOnDark} />
          <AppText variant="caption" color={colors.textOnDark}>
            {TEXT.photoTaken}
          </AppText>
        </View>
        {reference && (
          <View style={styles.thumb}>
            <Image source={reference} style={styles.thumbImage} contentFit="cover" aria-hidden />
            <AppText
              variant="caption"
              color={colors.textOnDark}
              align="center"
              style={styles.thumbLabel}
            >
              {TEXT.reference}
            </AppText>
          </View>
        )}
      </View>
    );
  }
  if (!reference) return null;
  return (
    <View style={styles.frame}>
      <Image source={reference} style={styles.image} contentFit="cover" aria-hidden />
      {tagged && (
        <View style={[styles.tag, styles.referenceTag]}>
          <Icon name="camera-outline" size={16} color={colors.text} />
          <AppText variant="caption">{TEXT.referenceImage}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.border },
  image: { width: '100%', aspectRatio: 4 / 3 },
  tag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  referenceTag: { right: spacing.sm, bottom: spacing.sm, backgroundColor: colors.surface },
  taken: { left: spacing.sm, top: spacing.sm, backgroundColor: colors.success },
  thumb: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 84,
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.translucentDark,
  },
  thumbImage: { width: '100%', aspectRatio: 4 / 3 },
  thumbLabel: { paddingVertical: 2 },
});
