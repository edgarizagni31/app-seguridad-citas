import { useSessionStore } from '../stores/session-store';

export const useCurrentUser = () => useSessionStore((state) => state.session?.user ?? null);
