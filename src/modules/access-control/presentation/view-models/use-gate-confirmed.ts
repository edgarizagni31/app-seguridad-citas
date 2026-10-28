import { useRouter } from 'expo-router';

import { driverOf, isDriver } from '../../domain';
import { formatEntryTime } from '../mappers/gate-text';
import { useGateFlowStore } from '../stores/gate-flow-store';
import { useDependencies } from '@/core/di';

export function useGateConfirmed() {
  const router = useRouter();
  const { config } = useDependencies();
  const session = useGateFlowStore((state) => state.session);
  const outcome = useGateFlowStore((state) => state.outcome);
  const reset = useGateFlowStore((state) => state.reset);

  const home = () => {
    reset();
    router.dismissAll();
  };

  if (!session || !outcome) return { ready: false as const, home };
  const { appointment } = session;
  const vehicular = session.mode === 'vehicular';
  const rejected = new Set(outcome.rejectedCompanions.map((item) => item.personId));

  const units = appointment.units.filter((unit) => session.presentedUnits[unit.id]);
  const drivers = units.flatMap((unit) => {
    const person = driverOf(appointment, unit);
    return person ? [person] : [];
  });
  const companions = appointment.people.filter((person) => !isDriver(appointment, person));
  const entering = vehicular
    ? [
        ...drivers,
        ...companions.filter(
          (person) => session.arrivedCompanions.includes(person.id) && !rejected.has(person.id),
        ),
      ]
    : appointment.people.filter((person) => session.presentedPeople[person.id]);
  const enteringIds = new Set(entering.map((person) => person.id));

  return {
    ready: true as const,
    vehicular,
    clientName: appointment.clientName ?? '—',
    code: appointment.code,
    enteredAt: formatEntryTime(
      outcome.confirmation.enteredAt,
      appointment.timeZoneId,
      config.timeZone,
    ),
    plates: units.map((unit) => unit.plate),
    entering: entering.map((person) => person.name),
    notEntering: vehicular
      ? companions.filter((person) => !enteringIds.has(person.id)).map((person) => person.name)
      : [],
    rejectedMessages: outcome.rejectedCompanions.map((item) => item.message),
    home,
    // El módulo de inspección abre la unidad por su id de unidad de transporte
    inspect: (transportUnitId: string) => {
      reset();
      router.dismissAll();
      router.push({ pathname: '/inspection/[vehicleId]', params: { vehicleId: transportUnitId } });
    },
    inspectable: units.map((unit) => ({ id: unit.transportUnitId, plate: unit.plate })),
  };
}
