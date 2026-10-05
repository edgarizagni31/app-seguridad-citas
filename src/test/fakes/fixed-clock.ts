import type { Clock } from '@/shared/domain';

export function createFixedClock(initial: Date | string = '2026-10-05T16:42:00.000Z') {
  let current = new Date(initial);
  return {
    now: () => new Date(current),
    set: (next: Date | string) => {
      current = new Date(next);
    },
    advanceSeconds: (seconds: number) => {
      current = new Date(current.getTime() + seconds * 1000);
    },
  } satisfies Clock & Record<string, unknown>;
}
