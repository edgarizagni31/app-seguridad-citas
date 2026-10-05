import type { Logger } from '@/shared/domain';

export function installGlobalErrorHandler(logger: Logger) {
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    logger.error('Error no capturado', { error, isFatal });
    previous(error, isFatal);
  });
}
