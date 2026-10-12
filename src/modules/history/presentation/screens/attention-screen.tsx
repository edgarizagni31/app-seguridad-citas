import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAttentionViewModel } from '../view-models/use-attention-view-model';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Button,
  colors,
  EmptyState,
  Icon,
  IconButton,
  radius,
  Screen,
  spacing,
} from '@/shared/ui';

const { attention: TEXT } = STRINGS;

export function AttentionScreen() {
  const router = useRouter();
  const vm = useAttentionViewModel();

  return (
    <Screen>
      <View style={styles.bar}>
        <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={() => router.back()} />
        <AppText variant="bodyStrong" role="heading" style={styles.flex}>
          {TEXT.title}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText color={colors.textMuted}>{TEXT.subtitle}</AppText>
        {vm.items.length === 0 && !vm.loading ? (
          <View style={styles.empty}>
            <EmptyState
              icon="check-decagram-outline"
              title={TEXT.emptyTitle}
              message={TEXT.emptyMessage}
            />
          </View>
        ) : (
          vm.items.map((item) => (
            <View key={item.id} style={styles.card} role="alert">
              <View style={styles.header}>
                <Icon name="alert-octagon" color={colors.danger} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{item.title}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {item.time}
                  </AppText>
                </View>
              </View>
              <View style={styles.section}>
                <AppText variant="caption" color={colors.textMuted}>
                  {TEXT.reason}
                </AppText>
                <AppText>{item.message}</AppText>
              </View>
              <View style={styles.section}>
                <AppText variant="caption" color={colors.textMuted}>
                  {TEXT.action}
                </AppText>
                <AppText variant="bodyStrong">{item.action}</AppText>
              </View>
              <Button
                label={TEXT.dismiss}
                icon="check"
                variant="outline"
                onPress={() => vm.dismiss(item.id)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  content: { padding: spacing.md, gap: spacing.md },
  empty: { paddingVertical: spacing.xl },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerTint,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: 2 },
});
