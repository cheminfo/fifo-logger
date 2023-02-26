import { v4 } from '@lukeed/uuid';
import { Logger } from 'pino';

import { getPino } from './getPino';

export type LogEntry = {
  time: number;
  level: number;
  levelLabel: string;
  uuids: string[];
  message: string;
  meta?: Record<string, any>;
  error?: Error;
};

export type FifoLoggerOptions = {
  /**
   * The maximum number of events to store.
   * @default 1000
   */
  limit?: number;
  /**
   * The minimum level of events to store.
   * Allowed values: 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'
   * @default 'info'
   *
   */
  level?: string;
  /**
   * Called when a new log is added.
   */
  onChange?: (log: LogEntry, logs: LogEntry[]) => void;
};

/**
 * A FIFO logger that stores the last events in an array.
 */
export class FifoLogger {
  private events: LogEntry[];
  private pino: Logger;
  private uuids: string[] = [];

  constructor(options: FifoLoggerOptions = {}) {
    this.uuids = [v4()];
    this.events = [];
    this.pino = getPino(this.events, this.uuids, options);
  }

  getPino(): Logger {
    return this.pino;
  }

  getLogs(
    options: {
      minLevel?: string;
      level?: string;
      includeChildren?: boolean;
    } = {},
  ): LogEntry[] {
    const { level, minLevel, includeChildren } = options;
    let logs = this.events.slice();

    if (includeChildren) {
      logs = logs.filter((log) => log.uuids.includes(this.uuids[0]));
    } else {
      logs = logs.filter((log) => log.uuids[0] === this.uuids[0]);
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

    return logs;
  }

  /**
   * @param bindings: an object of key-value pairs to include in log lines as properties.
   * @param options: an options object that will override child logger inherited options.
   */

  child(bindings?: Record<string, any>) {
    const newFifoLogger = new FifoLogger();

    newFifoLogger.events = this.events;
    newFifoLogger.uuids = [v4(), ...this.uuids];

    newFifoLogger.pino = this.pino.child({
      uuids: newFifoLogger.uuids,
      ...bindings,
    });

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
