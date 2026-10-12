import { Alert } from 'react-native';

import { useSignOut } from './use-sign-out';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

const { profile: TEXT } = STRINGS;

// Cierra sesión avisando antes si quedan registros sin sincronizar
export function useSignOutPrompt() {
  const { sync } = useDependencies();
  const signOut = useSignOut();

  return async () => {
    const { pending } = await sync.snapshot();
    if (pending === 0) return signOut();
    Alert.alert(TEXT.logoutWarningTitle, TEXT.logoutWarningMessage(pending), [
      { text: TEXT.cancel, style: 'cancel' },
      { text: TEXT.logoutAnyway, style: 'destructive', onPress: () => void signOut() },
    ]);
  };
}
