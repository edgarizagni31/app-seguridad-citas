import { create } from 'zustand';

import type { Session } from '../../domain';

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';
export type SessionNotice = 'session-expired';

type SessionState = {
  readonly status: SessionStatus;
  readonly session: Session | null;
  readonly notice: SessionNotice | null;
  setSession: (session: Session) => void;
  clearSession: (notice?: SessionNotice) => void;
  dismissNotice: () => void;
};

const INITIAL = { status: 'restoring', session: null, notice: null } as const;

export const useSessionStore = create<SessionState>()((set) => ({
  ...INITIAL,
  setSession: (session) => set({ status: 'authenticated', session, notice: null }),
  clearSession: (notice) => set({ status: 'anonymous', session: null, notice: notice ?? null }),
  dismissNotice: () => set({ notice: null }),
}));

export const resetSessionStore = () => useSessionStore.setState(INITIAL);
