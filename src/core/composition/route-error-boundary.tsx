import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';

import { useDependencies } from '@/core/di';
import { ErrorFallback } from '@/shared/ui';

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { logger } = useDependencies();

  useEffect(() => {
    logger.error('Error al renderizar la pantalla', { error });
  }, [error, logger]);

  return <ErrorFallback onRetry={() => void retry()} />;
}
