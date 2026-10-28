import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { DocumentCheck, GateDocument } from '../../domain';
import { formatDate, STRINGS } from '@/shared/lib';
import { AppText, Button, colors, Icon, type IconName, radius, sizes, spacing } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

const CHECK_ICON: Record<DocumentCheck, { icon: IconName; color: string }> = {
  valid: { icon: 'check-circle', color: colors.success },
  pending: { icon: 'clock-alert-outline', color: colors.warning },
  expired: { icon: 'alert-circle', color: colors.danger },
  rejected: { icon: 'close-circle', color: colors.danger },
};

type DocumentCardProps = {
  document: GateDocument;
  check: DocumentCheck;
  timeZone: string;
};

// Solo se consulta: los documentos se adjuntaron al crear la cita
export function DocumentCard({ document, check, timeZone }: DocumentCardProps) {
  const [open, setOpen] = useState(false);
  const name = document.name ?? TEXT.document;
  const { icon, color } = CHECK_ICON[check];
  const status =
    check === 'valid' && document.expiresAt
      ? TEXT.expiresOn(formatDate(new Date(document.expiresAt), timeZone))
      : TEXT.documentStatus[check];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="bodyStrong" style={styles.flex}>
          {name}
        </AppText>
        <Icon name={icon} color={color} size={sizes.icon} />
      </View>
      <AppText variant="caption" color={check === 'valid' ? colors.textMuted : color}>
        {status}
      </AppText>
      <View style={styles.row}>
        {document.fileUrl ? (
          <Image
            source={{ uri: document.fileUrl }}
            style={styles.thumbnail}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.thumbnail, styles.empty]}>
            <Icon name="file-image-outline" color={colors.textMuted} />
            <AppText variant="caption" color={colors.textMuted}>
              {TEXT.noImage}
            </AppText>
          </View>
        )}
        <Pressable
          role="button"
          aria-label={TEXT.viewDocument(name)}
          disabled={!document.fileUrl}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.view, (pressed || !document.fileUrl) && styles.dimmed]}
        >
          <Icon name="magnify-scan" color={colors.primaryText} />
        </Pressable>
      </View>
      {document.fileUrl && (
        <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.viewer}>
            <Image
              source={{ uri: document.fileUrl }}
              style={styles.flex}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
            <Button label={TEXT.closeImage} variant="outline" onPress={() => setOpen(false)} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumbnail: { flex: 1, height: 96, borderRadius: radius.md, backgroundColor: colors.border },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.xxs },
  view: {
    width: sizes.button,
    height: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.infoTint,
  },
  dimmed: { opacity: 0.5 },
  viewer: { flex: 1, gap: spacing.md, padding: spacing.md, backgroundColor: colors.text },
});
