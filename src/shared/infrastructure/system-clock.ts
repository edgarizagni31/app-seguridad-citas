import type { Clock } from '@/shared/domain';

export const systemClock: Clock = { now: () => new Date() };
