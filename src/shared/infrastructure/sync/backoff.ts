const BASE_MS = 2_000;
const MAX_MS = 10 * 60_000;

// Exponencial con jitter: evita que todos los equipos reintenten a la vez
export function backoffDelayMs(attempts: number, random: () => number = Math.random): number {
  const exponential = Math.min(BASE_MS * 2 ** Math.max(0, attempts - 1), MAX_MS);
  return Math.round(exponential * (0.5 + random() * 0.5));
}
