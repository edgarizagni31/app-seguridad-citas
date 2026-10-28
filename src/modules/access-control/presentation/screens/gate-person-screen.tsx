import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DocumentList } from '../components/document-list';
import { GateFooter } from '../components/gate-footer';
import { useGatePerson } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Avatar,
  Banner,
  Button,
  colors,
  IconButton,
  radius,
  Screen,
  spacing,
  StatusChip,
} from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GatePersonScreen() {
  const router = useRouter();
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const vm = useGatePerson(personId);
  if (!vm.session || !vm.person) return <Redirect href="/" />;
  const { person } = vm;
  const statusLabel = TEXT.visitorStatus[person.status] ?? person.status;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bar}>
          <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={() => router.back()} />
        </View>
        <View style={styles.profile}>
          <Avatar name={person.name} />
          <View style={styles.flex}>
            <AppText variant="heading" role="heading">
              {person.name}
            </AppText>
            {person.documentNumber && (
              <AppText color={colors.info}>{TEXT.documentShort(person.documentNumber)}</AppText>
            )}
          </View>
          {!person.enabled ? (
            <StatusChip label={statusLabel} tone="neutral" icon="cancel" />
          ) : vm.arrived ? (
            <StatusChip label={TEXT.arrived} tone="success" icon="check-circle" />
          ) : (
            <StatusChip label={TEXT.pending} tone="danger" icon="alert-circle" />
          )}
        </View>
        {!person.enabled && <Banner tone="warning" message={TEXT.notEnabled} />}
        <DocumentList title={TEXT.personDocuments} documents={person.documents} />
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
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  bar: { flexDirection: 'row' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
