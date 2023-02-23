type LogOptions = {
  kind?: string;
  error?: Error;
};

export class Logger {
  logs: LogEvent[];

  constructor() {
    this.logs = [];
  }

  inContext(context: string) {
    return new ContextLogger(this, context);
  }

  debug(message: string, options: LogOptions = {}) {
    this.log('debug', message, options);
  }

  info(message: string, options: LogOptions = {}) {
    this.log('info', message, options);
  }

  warn(message: string, options: LogOptions = {}) {
    this.log('warn', message, options);
  }

  error(message: string, error: Error, options: LogOptions = {}) {
    const { kind = 'log' } = options;
    this.logs.push({
      kind,
      level: 'error',
      message,
      timestamp: Date.now(),
      error,
    });
  }

  private log(level: LogLevel, message: string, options: LogOptions = {}) {
    const { kind = 'log' } = options;
    this.logs.push({
      kind,
      level,
      message,
      timestamp: Date.now(),
    });
  }
}

class ContextLogger {
  logger: Logger;
  context: string;

  constructor(logger: Logger, context: string) {
    this.logger = logger;
    this.context = context;
  }

  debug(message: string, options: LogOptions = {}) {
    this.logger.debug(message, options);
  }

  info(message: string, options: LogOptions = {}) {
    this.logger.info(message, options);
  }

  warn(message: string, options: LogOptions = {}) {
    this.logger.warn(message, options);
  }

  error(message: string, error: Error, options: LogOptions = {}) {
    this.logger.error(message, error, options);
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEvent = {
  kind: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
  error?: Error;
};

type ErrorLogEvent = LogEvent & {
  level: 'error';
  error: Error;
};
