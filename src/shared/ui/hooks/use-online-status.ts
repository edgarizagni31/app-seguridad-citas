import { useEffect, useState } from 'react';

import type { Connectivity } from '@/shared/domain';

// null mientras no se conoce el estado
export function useOnlineStatus(connectivity: Connectivity): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void connectivity.isOnline().then((value) => active && setOnline(value));
    const unsubscribe = connectivity.subscribe(setOnline);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [connectivity]);

  return online;
}
