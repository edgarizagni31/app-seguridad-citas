import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DocumentList } from '../components/document-list';
import { GateFooter } from '../components/gate-footer';
import { PersonRow } from '../components/person-row';
import { PlateBadge } from '../components/plate-badge';
import { useGateUnit } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  colors,
  Icon,
  IconButton,
  radius,
  Screen,
  spacing,
  StatusChip,
  Tabs,
  TextField,
} from '@/shared/ui';

const { gate: TEXT } = STRINGS;

const TABS = [
  { value: 'vehicle', label: TEXT.vehicleTab },
  { value: 'driver', label: TEXT.driverTab },
] as const;

export function GateUnitScreen() {
  const router = useRouter();
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const vm = useGateUnit(unitId);
  if (!vm.session || !vm.unit) return <Redirect href="/" />;

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={() => router.back()} />
        <View style={styles.truck}>
          <Icon name="truck-outline" color={colors.primaryText} size={36} />
        </View>
        <View style={styles.titles}>
          <PlateBadge plate={vm.unit.plate} size="lg" />
          <AppText variant="caption" color={colors.textMuted} role="heading">
            {vm.number}
          </AppText>
        </View>
      </View>
      <View style={styles.tabs}>
        <Tabs options={TABS} value={vm.tab} onChange={vm.setTab} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {vm.tab === 'vehicle' ? (
          <DocumentList title={TEXT.vehicleDocuments} documents={vm.unit.documents} />
        ) : (
          <View style={styles.section}>
            {vm.driver ? (
              <>
                <PersonRow
                  person={vm.driver}
                  arrived={false}
                  trailing={<StatusChip label={TEXT.driverRole} tone="info" icon="steering" />}
                />
                <DocumentList title={TEXT.driverDocuments} documents={vm.driver.documents} />
              </>
            ) : (
              <Banner tone="warning" message={TEXT.noDriver} />
            )}
            {vm.askDriverDocument && (
              <View style={styles.driverDocument}>
                <AppText color={colors.textMuted}>{TEXT.driverDocumentHint}</AppText>
                <TextField
                  label={TEXT.driverDocument}
                  icon="card-account-details-outline"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={vm.driverDocument}
                  onChangeText={vm.setDriverDocument}
                  error={vm.documentError ?? undefined}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <GateFooter>
        {vm.error && <Banner tone="error" message={vm.error} />}
        <Button
          label={TEXT.continue}
          icon="arrow-right"
          size="lg"
          loading={vm.busy}
          disabled={!vm.canContinue}
          onPress={vm.present}
        />
      </GateFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  truck: {
    width: 64,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.infoTint,
  },
  titles: { flex: 1, gap: spacing.xxs },
  tabs: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  content: { padding: spacing.md, gap: spacing.md },
  section: { gap: spacing.md },
  driverDocument: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningTint,
  },
});
