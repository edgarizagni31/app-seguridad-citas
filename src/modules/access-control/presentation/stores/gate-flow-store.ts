import { create } from 'zustand';

import {
  chooseMode,
  markCompanion,
  startSession,
  type GateAppointment,
  type GateEntryOutcome,
  type GateMode,
  type GateSession,
} from '../../domain';

// Lo presentado existe solo en la sesión: el backend no devuelve el estado de llegada
type GateFlowState = {
  readonly session: GateSession | null;
  readonly outcome: GateEntryOutcome | null;
  start: (appointment: GateAppointment) => void;
  setMode: (mode: GateMode) => void;
  update: (session: GateSession) => void;
  toggleCompanion: (personId: string, arrived: boolean) => void;
  finish: (outcome: GateEntryOutcome) => void;
  reset: () => void;
};

export const useGateFlowStore = create<GateFlowState>()((set) => ({
  session: null,
  outcome: null,
  start: (appointment) => set({ session: startSession(appointment), outcome: null }),
  setMode: (mode) =>
    set((state) => ({ session: state.session && chooseMode(state.session, mode) })),
  update: (session) => set({ session }),
  toggleCompanion: (personId, arrived) =>
    set((state) => ({
      session: state.session && markCompanion(state.session, personId, arrived),
    })),
  finish: (outcome) => set({ outcome }),
  reset: () => set({ session: null, outcome: null }),
}));
