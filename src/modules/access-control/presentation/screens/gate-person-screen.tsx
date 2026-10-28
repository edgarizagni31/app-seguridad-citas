import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DocumentList } from '../components/document-list';
import { GateTopBar } from '../components/gate-top-bar';
import { PersonRow } from '../components/person-row';
import { useGatePerson } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import { Banner, Button, colors, Screen, spacing } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GatePersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const vm = useGatePerson(personId);
  if (!vm.session || !vm.person) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <GateTopBar title={TEXT.personDocuments} />
        <PersonRow person={vm.person} arrived={vm.arrived} />
        {!vm.person.enabled && <Banner tone="warning" message={TEXT.notEnabled} />}
        <DocumentList title={TEXT.personDocuments} documents={vm.person.documents} />
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
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
