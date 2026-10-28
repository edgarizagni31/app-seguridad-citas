import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DocumentList } from '../components/document-list';
import { GateTopBar } from '../components/gate-top-bar';
import { useGateUnit } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  colors,
  Icon,
  radius,
  Screen,
  SegmentedControl,
  spacing,
  TextField,
} from '@/shared/ui';

const { gate: TEXT } = STRINGS;

const TABS = [
  { value: 'vehicle', label: TEXT.vehicleTab },
  { value: 'driver', label: TEXT.driverTab },
] as const;

export function GateUnitScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const vm = useGateUnit(unitId);
  if (!vm.session || !vm.unit) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GateTopBar
          title={vm.unit.plate}
          subtitle={vm.number}
          leading={
            <View style={styles.truck}>
              <Icon name="truck-outline" color={colors.primaryText} size={32} />
            </View>
          }
        />
        <SegmentedControl
          label={TEXT.documentsOf(vm.unit.plate)}
          options={TABS}
          value={vm.tab}
          onChange={vm.setTab}
        />

        {vm.tab === 'vehicle' ? (
          <DocumentList title={TEXT.vehicleDocuments} documents={vm.unit.documents} />
        ) : (
          <View style={styles.section}>
            {vm.driver ? (
              <>
                <AppText variant="bodyStrong">{vm.driver.name}</AppText>
                {vm.driver.documentNumber && (
                  <AppText color={colors.textMuted}>{vm.driver.documentNumber}</AppText>
                )}
                <DocumentList title={TEXT.driverDocuments} documents={vm.driver.documents} />
              </>
            ) : (
              <Banner tone="warning" message={TEXT.noDriver} />
            )}
            {vm.askDriverDocument && (
              <View style={styles.section}>
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
      <View style={styles.footer}>
        {vm.error && <Banner tone="error" message={vm.error} />}
        <Button
          label={TEXT.continue}
          icon="arrow-right"
          size="lg"
          loading={vm.busy}
          disabled={!vm.canContinue}
          onPress={vm.present}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  section: { gap: spacing.sm },
  truck: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.infoTint,
  },
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
