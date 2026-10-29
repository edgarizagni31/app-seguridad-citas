import { create } from 'zustand';

import type { GateAppointment } from '@/modules/access-control';

// La cita escaneada por HSE, mientras elige la placa a inspeccionar
type InspectionScanState = {
  readonly appointment: GateAppointment | null;
  setAppointment: (appointment: GateAppointment) => void;
  clear: () => void;
};

export const useInspectionScanStore = create<InspectionScanState>()((set) => ({
  appointment: null,
  setAppointment: (appointment) => set({ appointment }),
  clear: () => set({ appointment: null }),
}));
