/**
 * Structured JSON logging (Cluster: Glass). Wraps Pino so every call site
 * uses the same (message, context) shape instead of pino's (context,
 * message) argument order, and centralizes redaction paths.
 */
import pino, { type Logger as PinoLogger } from 'pino';

export interface LogContext {
  correlationId?: string;
  guildId?: string;
  userId?: string;
  shardId?: number;
  module?: string;
  command?: string;
  [key: string]: unknown;
}

export const REDACT_PATHS = [
  'token',
  '*.token',
  '*.*.token',
  'password',
  '*.password',
  '*.*.password',
  'secret',
  '*.secret',
  '*.*.secret',
  'authorization',
  '*.authorization',
  '*.*.authorization',
  '*.Authorization',
  '*.botToken',
  '*.internalApiKey',
  '*.webhookUrl',
  '*.signingKey',
  '*.apiKey',
  '*.*.apiKey',
  '*.clientSecret',
  '*.accessToken',
  '*.refreshToken',
];

export class Logger {
  constructor(private readonly pinoInstance: PinoLogger) {}

  child(context: LogContext): Logger {
    return new Logger(this.pinoInstance.child(context));
  }

  trace(msg: string, context: LogContext = {}): void {
    this.pinoInstance.trace(context, msg);
  }

  debug(msg: string, context: LogContext = {}): void {
    this.pinoInstance.debug(context, msg);
  }

  info(msg: string, context: LogContext = {}): void {
    this.pinoInstance.info(context, msg);
  }

  warn(msg: string, context: LogContext = {}): void {
    this.pinoInstance.warn(context, msg);
  }

  error(msg: string, context: LogContext = {}): void {
    this.pinoInstance.error(context, msg);
  }

  fatal(msg: string, context: LogContext = {}): void {
    this.pinoInstance.fatal(context, msg);
  }

  setLevel(level: string): void {
    this.pinoInstance.level = level;
  }
}

export function createLogger(level: string): Logger {
  const instance = pino({
    level,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  });
  return new Logger(instance);
}
