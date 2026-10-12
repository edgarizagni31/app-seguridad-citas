import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { EntryDraft } from '../../domain';
import { useDependencies } from '@/core/di';
import { formatTime, STRINGS } from '@/shared/lib';
import { AppText, ASSETS, colors, Icon, radius, shadows, spacing } from '@/shared/ui';

const { entry: TEXT } = STRINGS;

type VehicleCardProps = {
  draft: Pick<
    EntryDraft,
    'plate' | 'voucherCode' | 'carrierName' | 'clientName' | 'windowStart' | 'windowEnd'
  >;
};

export function VehicleCard({ draft }: VehicleCardProps) {
  const { config } = useDependencies();
  const [expanded, setExpanded] = useState(false);
  const time = (iso: string) => formatTime(new Date(iso), config.timeZone);

  return (
    <Pressable
      role="button"
      aria-label={`${draft.plate}, ${TEXT.voucher} ${draft.voucherCode}`}
      aria-expanded={expanded}
      onPress={() => setExpanded((open) => !open)}
      style={styles.card}
    >
      <View style={styles.row}>
        <Image source={ASSETS.vehiclePhoto} style={styles.photo} contentFit="cover" aria-hidden />
        <View style={styles.texts}>
          <AppText variant="heading">{draft.plate}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {TEXT.voucher}
          </AppText>
          <AppText variant="label" numberOfLines={1}>
            {draft.voucherCode}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {draft.carrierName}
          </AppText>
        </View>
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} color={colors.accent} />
      </View>
      {expanded && (
        <View style={styles.details}>
          <Icon name="warehouse" size={18} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted}>
            {`${draft.clientName} · ${TEXT.appointmentWindow(time(draft.windowStart), time(draft.windowEnd))}`}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photo: { width: 88, height: 72, borderRadius: radius.md },
  texts: { flex: 1, gap: 1 },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
