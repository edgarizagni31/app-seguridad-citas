import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentHeader } from '../components/appointment-header';
import { GateFooter } from '../components/gate-footer';
import { GateProgress } from '../components/gate-progress';
import { GateTopBar } from '../components/gate-top-bar';
import { PersonRow } from '../components/person-row';
import { useGatePeople } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import { AppText, Banner, Button, EmptyState, Screen, spacing, TextField } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GatePeopleScreen() {
  const vm = useGatePeople();
  if (!vm.session) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GateTopBar title={TEXT.pedestrian} />
        <AppointmentHeader appointment={vm.session.appointment} />
        <View style={styles.heading}>
          <AppText variant="heading" role="heading">
            {TEXT.peopleTitle(vm.expectedCount)}
          </AppText>
          <GateProgress
            done={vm.presentedCount}
            total={vm.expectedCount}
            label={TEXT.peopleProgress(vm.presentedCount, vm.expectedCount)}
          />
        </View>
        <TextField
          label={TEXT.searchPeople}
          icon="magnify"
          placeholder={TEXT.searchPeople}
          autoCorrect={false}
          value={vm.query}
          onChangeText={vm.setQuery}
        />
        {vm.people.length === 0 && (
          <EmptyState
            icon="account-search-outline"
            title={TEXT.noPeople}
            message={TEXT.searchHint}
          />
        )}
        {vm.people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            arrived={vm.arrived(person.id)}
            onPress={() => vm.open(person.id)}
          />
        ))}
      </ScrollView>
      {vm.presentedCount > 0 && (
        <GateFooter>
          {vm.error && <Banner tone="error" message={vm.error} />}
          <Button
            label={TEXT.confirmCount(vm.presentedCount)}
            icon="check"
            size="lg"
            loading={vm.busy}
            disabled={!vm.canConfirm}
            onPress={vm.confirm}
          />
        </GateFooter>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  heading: { gap: spacing.sm },
});
