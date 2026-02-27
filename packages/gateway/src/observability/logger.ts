import pino from 'pino';

export interface LogContext {
  requestId?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  latencyMs?: number;
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createRequestLogger(context: LogContext): pino.Logger {
  return logger.child(context);
}

export { logger };
export default logger;
