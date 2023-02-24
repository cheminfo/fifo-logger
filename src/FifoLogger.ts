import { v4 } from '@lukeed/uuid';
import pino, { Logger } from 'pino';

type LogEntry = {
  message: string | undefined;
  meta: Record<string, any> | undefined;
  level: number;
  levelLabel: string;
  context: string | undefined;
  error: Error | undefined;
};

type FifoLoggerOptions = {
  /**
   * The maximum number of events to store.
   * @default 10000
   */
  limit?: number;
  /**
   * The minimum level of events to store.
   * Allowed values: 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'
   * g
   * @default 'info'
   *
   */
  level?: string;
};

/**
 * A FIFO logger that stores the last events in an array.
 */
export class FifoLogger {
  private events: LogEntry[];
  private pino: Logger;
  private context: string;

  constructor(options: FifoLoggerOptions = {}) {
    const { limit = 10000, level = 'info' } = options;
    this.events = [];
    this.pino = getPino(this.events, { limit, level });
    this.context = '';
  }

  getPino(): Logger {
    return this.pino;
  }

  getLogs(options: { minLevel?: string; level?: string } = {}): LogEntry[] {
    const { level, minLevel } = options;
    let logs = this.events.slice();

    if (this.context) {
      logs = logs.filter((e) => e.context === this.context);
    }
    if (level) {
      const levelNumber = Number(this.pino.levels.values[level]);
      if (Number.isNaN(levelNumber)) {
        throw new Error('Invalid level');
      }
      logs = logs.filter((log) => log.level === levelNumber);
    }
    if (minLevel) {
      const levelNumber = Number(this.pino.levels.values[minLevel]);
      if (Number.isNaN(levelNumber)) {
        throw new Error('Invalid level');
      }
      logs = logs.filter((log) => log.level >= levelNumber);
    }

    return logs.map((log) => ({
      ...log,
      levelLabel: this.pino.levels.labels[log.level],
    }));
  }

  child(context = v4()) {
    const newFifoLogger = new FifoLogger();

    newFifoLogger.events = this.events;
    newFifoLogger.context = context;
    newFifoLogger.pino = this.pino.child({ context });

    return newFifoLogger;
  }

  trace(...args: any[]) {
    //@ts-expect-error not easy to fix
    this.pino.trace(...args);
  }

  debug(...args: any[]) {
    //@ts-expect-error not easy to fix
    this.pino.debug(...args);
  }

  info(...args: any[]) {
    //@ts-expect-error not easy to fix
    this.pino.info(...args);
  }

  warn(...args: any[]) {
    //@ts-expect-error not easy to fix
    this.pino.warn(...args);
  }

  error(...args: any[]) {
    //@ts-expect-error not easy to fix
    this.pino.error(...args);
  }

  fatal(...args: any[]) {
    //@ts-expect-error not easy to fix
    this.pino.fatal(...args);
  }
}

function getPino(
  events: any[],
  options: { level: string; limit: number },
): Logger {
  return pino(
    {
      level: options.level,
      base: {},
      // messageKey: 'message', // seems it is not taken into account in browser
      // errorKey: 'error',
      // nestedKey: 'meta',
      browser: {
        write: (event) => {
          addEvent(events, event, options);
        },
      },
    },
    {
      write: (event) => {
        addEvent(events, JSON.parse(event), options);
      },
    },
  );
}

function addEvent(events: any[], event: any, options: { limit?: number } = {}) {
  const { level, context, time, msg, err, ...rest } = event;
  const { limit = 10000 } = options;
  events.push({ level, time, context, message: msg, error: err, meta: rest });
  if (events.length > limit) {
    events.shift();
  }
}
