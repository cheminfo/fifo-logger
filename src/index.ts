const DEBUG = 0;
const INFO = 1;
const WARN = 2;
const ERROR = 3;

const levelToNumber = {
  debug: DEBUG,
  info: INFO,
  warn: WARN,
  error: ERROR,
};

type LogOptions = {
  kind?: string;
  context?: string;
  error?: Error;
};

type LoggerOptions = {
  /**
   * Maximum number of logs to keep in memory.
   * @default 10000
   */
  limit?: number;
  /**
   * Minimum log level to keep in memory.
   * @default 'info'
   */
  minLevel?: LogLevel;
};

export class Logger {
  private logs: LogEvent[];
  minLevel: number;
  limit: number;

  constructor(options: LoggerOptions = {}) {
    this.logs = [];
    this.limit = options.limit || 10000;
    this.minLevel = levelToNumber[options.minLevel || 'info'];
  }

  inContext(context: string) {
    return new ContextLogger(this, context);
  }

  debug(message: string, options: LogOptions = {}) {
    if (this.minLevel < DEBUG) return;
    this.log('debug', message, options);
  }

  info(message: string, options: LogOptions = {}) {
    if (this.minLevel < INFO) return;
    this.log('info', message, options);
  }

  warn(message: string, options: LogOptions = {}) {
    if (this.minLevel < WARN) return;
    this.log('warn', message, options);
  }

  error(message: string, error: Error, options: LogOptions = {}) {
    const { kind = 'log', context } = options;
    this.logs.push({
      kind,
      level: 'error',
      levelNumber: ERROR,
      message,
      context,
      timestamp: Date.now(),
      error,
    });
  }

  private log(level: LogLevel, message: string, options: LogOptions = {}) {
    const { kind = 'log', context } = options;
    this.logs.push({
      kind,
      level,
      levelNumber: levelToNumber[level],
      message,
      context,
      timestamp: Date.now(),
    });
  }

  getLogs(options: { minLevel?: LogLevel; context?: string } = {}) {
    const { minLevel = 'info', context } = options;
    const minLevelNumber = levelToNumber[minLevel];

    return this.logs.filter((log: LogEvent) => {
      if (log.levelNumber < minLevelNumber) return false;
      if (context && log.context !== context) return false;
      return true;
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
    this.logger.debug(message, { context: this.context, ...options });
  }

  info(message: string, options: LogOptions = {}) {
    this.logger.info(message, { context: this.context, ...options });
  }

  warn(message: string, options: LogOptions = {}) {
    this.logger.warn(message, { context: this.context, ...options });
  }

  error(message: string, error: Error, options: LogOptions = {}) {
    this.logger.error(message, error, { context: this.context, ...options });
  }

  getLogs(options: { minLevel?: LogLevel } = {}) {
    return this.logger.getLogs({ context: this.context, ...options });
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEvent = {
  kind: string;
  level: LogLevel;
  levelNumber: number;
  message: string;
  timestamp: number;
  context?: string;
  error?: Error;
};

type ErrorLogEvent = LogEvent & {
  level: 'error';
  error: Error;
};
