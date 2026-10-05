import type { Clock, Logger } from '@/shared/domain';

export type AppConfig = {
  readonly appVersion: string;
  readonly timeZone: string;
  readonly isDemoAuth: boolean;
};

export type Dependencies = {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
};
