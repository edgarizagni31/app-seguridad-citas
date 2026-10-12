import { create } from 'zustand';

import {
  startDraft,
  type CheckedBy,
  type EntryDraft,
  type UnitValidation,
  type VehicleEntryRecord,
} from '../../domain';

// Estado del flujo de ingreso en curso: vive solo en memoria hasta confirmarse
type EntryFlowState = {
  readonly draft: EntryDraft | null;
  readonly checkedBy: CheckedBy | null;
  readonly record: VehicleEntryRecord | null;
  start: (validation: UnitValidation) => void;
  setDraft: (draft: EntryDraft) => void;
  finish: (record: VehicleEntryRecord) => void;
};

const INITIAL = { draft: null, checkedBy: null, record: null };

export const useEntryFlowStore = create<EntryFlowState>()((set) => ({
  ...INITIAL,
  start: (validation) =>
    set({ draft: startDraft(validation), checkedBy: validation.checkedBy, record: null }),
  setDraft: (draft) => set({ draft }),
  finish: (record) => set({ record }),
}));

export const resetEntryFlow = () => useEntryFlowStore.setState(INITIAL);
