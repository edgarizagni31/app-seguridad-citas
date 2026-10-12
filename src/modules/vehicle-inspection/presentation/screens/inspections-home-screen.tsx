import { FlashList } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppointmentCard } from '../components/appointment-card';
import { IndicatorCard } from '../components/indicator-card';
import { useInspectionsHome, type BoardFilter } from '../view-models/use-inspections-home';
import { UserHeader } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  colors,
  EmptyState,
  Icon,
  radius,
  Screen,
  sizes,
  spacing,
  typography,
} from '@/shared/ui';

const { inspections: TEXT } = STRINGS;

const FILTERS: { value: BoardFilter; label: string }[] = [
  { value: 'all', label: TEXT.all },
  { value: 'pending', label: TEXT.pending },
  { value: 'in_progress', label: TEXT.inProgress },
  { value: 'inspected', label: TEXT.inspected },
];

export function InspectionsHomeScreen() {
  const vm = useInspectionsHome();

  const header = (
    <View style={styles.header}>
      <UserHeader roleLabel={STRINGS.session.hseRole} subtitle={TEXT.welcome} />
      <View style={styles.titles}>
        <AppText variant="heading" role="heading">
          {TEXT.title}
        </AppText>
        <View style={styles.row}>
          <Icon name="calendar-blank-outline" size={sizes.iconSm} color={colors.textMuted} />
          <AppText color={colors.textMuted}>{TEXT.today(vm.today)}</AppText>
        </View>
      </View>
      <View style={styles.indicators}>
        <IndicatorCard
          label={TEXT.pending}
          value={vm.counts.pending}
          icon="clock-outline"
          tone="warning"
          selected={vm.filter === 'pending'}
          onPress={() => vm.setFilter('pending')}
        />
        <IndicatorCard
          label={TEXT.inProgress}
          value={vm.counts.inProgress}
          icon="progress-clock"
          tone="info"
          selected={vm.filter === 'in_progress'}
          onPress={() => vm.setFilter('in_progress')}
        />
        <IndicatorCard
          label={TEXT.inspected}
          value={vm.counts.inspected}
          icon="check-circle"
          tone="success"
          selected={vm.filter === 'inspected'}
          onPress={() => vm.setFilter('inspected')}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.search}>
          <Icon name="magnify" color={colors.textMuted} />
          <TextInput
            value={vm.query}
            onChangeText={vm.setQuery}
            placeholder={TEXT.search}
            placeholderTextColor={colors.textMuted}
            aria-label={TEXT.search}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
        <Pressable
          role="button"
          aria-label={TEXT.scan}
          onPress={vm.scan}
          style={({ pressed }) => [styles.scan, pressed && styles.pressed]}
        >
          <Icon name="qrcode-scan" color={colors.textOnDark} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        role="tablist"
        aria-label={TEXT.filters}
      >
        {FILTERS.map((option) => {
          const selected = vm.filter === option.value;
          return (
            <Pressable
              key={option.value}
              role="tab"
              aria-selected={selected}
              aria-label={option.label}
              onPress={() => vm.setFilter(option.value)}
              style={[styles.filter, selected && styles.filterSelected]}
            >
              <AppText variant="label" color={selected ? colors.textOnDark : colors.text}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Screen edges={[]}>
      <FlashList
        data={vm.appointments}
        keyExtractor={(group) => group.appointment.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <AppointmentCard
            appointment={item.appointment}
            vehicles={item.vehicles}
            time={vm.time}
            isLast={index === vm.appointments.length - 1}
            onOpenAppointment={() => vm.openAppointment(item.appointment.id)}
            onOpenVehicle={(vehicle) => vm.openVehicle(vehicle.id)}
          />
        )}
        ListEmptyComponent={
          vm.loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <EmptyState
                icon="truck-check-outline"
                title={TEXT.emptyTitle}
                message={vm.hasVehicles ? TEXT.noResults : TEXT.emptyMessage}
              />
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.md },
  titles: { gap: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  indicators: { flexDirection: 'row', gap: spacing.xs },
  search: {
    flex: 1,
    minHeight: sizes.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.xs },
  scan: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  filters: { gap: spacing.xs },
  filter: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  loading: { marginTop: spacing.xl },
  empty: { paddingVertical: spacing.xl },
  pressed: { opacity: 0.75 },
});
