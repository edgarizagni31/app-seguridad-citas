import type { LogContext, LogLevel, Logger } from '@/shared/domain';

export type LogEntry = {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: LogContext;
  readonly timestamp: string;
};

export type LogSink = (entry: LogEntry) => void;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const SENSITIVE_KEY = /authorization|token|password|secret|credential|cookie|email|correo|qr|raw/i;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]*/g;
const MAX_DEPTH = 5;
export const REDACTED = '[REDACTED]';

const scrub = (text: string) => text.replace(JWT, '[JWT]');

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrub(value);
  if (value instanceof Error) return { name: value.name, message: scrub(value.message) };
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1),
    ]),
  );
}

export const consoleSink: LogSink = ({ level, message, context }) => {
  const output = level === 'error' ? console.error : console.warn;
  output(`[${level.toUpperCase()}] ${message}`, context ?? '');
};

type LoggerOptions = {
  minLevel: LogLevel;
  sink?: LogSink;
  now?: () => Date;
};

export function createLogger({
  minLevel,
  sink = consoleSink,
  now = () => new Date(),
}: LoggerOptions): Logger {
  const log = (level: LogLevel) => (message: string, context?: LogContext) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    sink({
      level,
      message: scrub(message),
      context: context && (redact(context) as LogContext),
      timestamp: now().toISOString(),
    });
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}
