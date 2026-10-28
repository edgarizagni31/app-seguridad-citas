import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  availableModes,
  DRIVER_DOCUMENT_REQUIRED,
  driverOf,
  matchesPerson,
  matchesUnit,
  nonDrivers,
  presentedPeopleCount,
  presentedUnitCount,
  unitNumber,
  type GateMode,
  type GateSession,
  type PresentError,
} from '../../domain';
import { gateErrorMessage } from '../mappers/gate-text';
import { useGateFlowStore } from '../stores/gate-flow-store';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

const { gate: TEXT } = STRINGS;

// Ejecuta un paso contra el servidor mostrando su progreso y su error
function useServerStep() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async <T>(task: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      return await task();
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export function useGateMode() {
  const router = useRouter();
  const session = useGateFlowStore((state) => state.session);
  const setMode = useGateFlowStore((state) => state.setMode);
  const modes = session ? availableModes(session.appointment) : null;

  return {
    session,
    modes,
    counts: session
      ? {
          units: session.appointment.units.length,
          people: nonDrivers(session.appointment).length,
        }
      : null,
    choose: (mode: GateMode) => {
      setMode(mode);
      router.push(mode === 'vehicular' ? '/gate/units' : '/gate/people');
    },
    scanAnother: () => router.back(),
  };
}

export function useGateUnits() {
  const router = useRouter();
  const session = useGateFlowStore((state) => state.session);
  const [query, setQuery] = useState('');
  const appointment = session?.appointment;

  return {
    session,
    query,
    setQuery,
    units: (appointment?.units ?? [])
      .filter((unit) => matchesUnit(unit, query))
      .map((unit) => ({
        id: unit.id,
        plate: unit.plate,
        number: TEXT.unitNumber(unitNumber(appointment!, unit.id)),
        driverName: unit.driver?.name ?? null,
        presented: Boolean(session?.presentedUnits[unit.id]),
      })),
    totalUnits: appointment?.units.length ?? 0,
    presentedCount: session ? presentedUnitCount(session) : 0,
    canConfirm: Boolean(appointment?.eligible),
    open: (unitId: string) => router.push({ pathname: '/gate/unit/[unitId]', params: { unitId } }),
    toVisitors: () => router.push('/gate/visitors'),
  };
}

export function useGateUnit(unitId: string) {
  const router = useRouter();
  const { gate } = useDependencies();
  const session = useGateFlowStore((state) => state.session);
  const update = useGateFlowStore((state) => state.update);
  const step = useServerStep();
  const [tab, setTab] = useState<'vehicle' | 'driver'>('vehicle');
  const [driverDocument, setDriverDocument] = useState('');
  const [needsDriverDocument, setNeedsDriverDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const appointment = session?.appointment;
  const unit = appointment?.units.find((candidate) => candidate.id === unitId) ?? null;
  const driver = appointment && unit ? driverOf(appointment, unit) : null;
  const askDriverDocument = Boolean(unit && (!unit.driver || needsDriverDocument));

  const present = async (current: GateSession) => {
    if (askDriverDocument && !driverDocument.trim()) {
      setTab('driver');
      setDocumentError(TEXT.driverDocumentRequired);
      return;
    }
    setDocumentError(null);
    const result = await step.run(() =>
      gate.presentUnit(current, unitId, askDriverDocument ? driverDocument : null),
    );
    if (result.ok) {
      update(result.value);
      router.back();
      return;
    }
    if (isDriverRequired(result.error)) {
      setNeedsDriverDocument(true);
      setTab('driver');
    }
    step.setError(gateErrorMessage(result.error));
  };

  return {
    session,
    unit,
    number: appointment && unit ? TEXT.unitNumber(unitNumber(appointment, unit.id)) : '',
    driver,
    tab,
    setTab,
    askDriverDocument,
    driverDocument,
    setDriverDocument,
    documentError,
    busy: step.busy,
    error: step.error,
    canContinue: Boolean(appointment?.eligible),
    present: () => {
      if (session) void present(session);
    },
  };
}

const isDriverRequired = (error: PresentError) =>
  error.type === 'not-presented' && error.reason === DRIVER_DOCUMENT_REQUIRED;

export function useGateVisitors() {
  const router = useRouter();
  const { gate } = useDependencies();
  const session = useGateFlowStore((state) => state.session);
  const toggleCompanion = useGateFlowStore((state) => state.toggleCompanion);
  const finish = useGateFlowStore((state) => state.finish);
  const step = useServerStep();
  const appointment = session?.appointment;

  const presentedUnits = (appointment?.units ?? []).filter(
    (unit) => session?.presentedUnits[unit.id],
  );
  const drivers = presentedUnits.flatMap((unit) => {
    const person = appointment ? driverOf(appointment, unit) : null;
    return person ? [{ person, plate: unit.plate }] : [];
  });

  const confirm = async (current: GateSession) => {
    const result = await step.run(() => gate.confirmVehicle(current));
    if (!result.ok) return step.setError(gateErrorMessage(result.error));
    finish(result.value);
    router.replace('/gate/confirmed');
  };

  return {
    session,
    drivers,
    companions: appointment ? nonDrivers(appointment) : [],
    arrived: (personId: string) => Boolean(session?.arrivedCompanions.includes(personId)),
    mark: toggleCompanion,
    busy: step.busy,
    error: step.error,
    canConfirm: Boolean(appointment?.eligible) && presentedUnits.length > 0,
    confirm: () => {
      if (session) void confirm(session);
    },
  };
}

export function useGatePeople() {
  const router = useRouter();
  const { gate } = useDependencies();
  const session = useGateFlowStore((state) => state.session);
  const finish = useGateFlowStore((state) => state.finish);
  const step = useServerStep();
  const [query, setQuery] = useState('');
  const appointment = session?.appointment;
  const expected = appointment ? nonDrivers(appointment) : [];

  const confirm = async (current: GateSession) => {
    const result = await step.run(() => gate.confirmPedestrian(current));
    if (!result.ok) return step.setError(gateErrorMessage(result.error));
    finish(result.value);
    router.replace('/gate/confirmed');
  };

  return {
    session,
    query,
    setQuery,
    expectedCount: expected.length,
    people: expected.filter((person) => matchesPerson(person, query)),
    arrived: (personId: string) => Boolean(session?.presentedPeople[personId]),
    presentedCount: session ? presentedPeopleCount(session) : 0,
    open: (personId: string) =>
      router.push({ pathname: '/gate/person/[personId]', params: { personId } }),
    busy: step.busy,
    error: step.error,
    canConfirm: Boolean(appointment?.eligible),
    confirm: () => {
      if (session) void confirm(session);
    },
  };
}

export function useGatePerson(personId: string) {
  const router = useRouter();
  const { gate } = useDependencies();
  const session = useGateFlowStore((state) => state.session);
  const update = useGateFlowStore((state) => state.update);
  const step = useServerStep();
  const person = session?.appointment.people.find((candidate) => candidate.id === personId) ?? null;

  const present = async (current: GateSession) => {
    const result = await step.run(() => gate.presentPerson(current, personId));
    if (!result.ok) return step.setError(gateErrorMessage(result.error));
    update(result.value);
    router.back();
  };

  return {
    session,
    person,
    arrived: Boolean(session?.presentedPeople[personId]),
    busy: step.busy,
    error: step.error,
    canContinue: Boolean(session?.appointment.eligible && person?.enabled),
    present: () => {
      if (session) void present(session);
    },
  };
}
