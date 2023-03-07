import { v4 } from '@lukeed/uuid';

import { LevelNumber, LevelWithSilent, levels } from './levels';

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
  level?: LevelWithSilent;
  /**
   * Called when a new log is added.
   */
  onChange?: (
    log: LogEntry | undefined,
    logs: LogEntry[],
    info: { depth: number },
  ) => void;
  /**
   * An object of key-value pairs to include in log lines as properties.
   */
  bindings?: Record<string, any>;
};

/**
 * A FIFO logger that stores the last events in an array.
 */
export class FifoLogger {
  private events: LogEntry[];
  private uuids: string[];
  private levelAsNumber: number;
  private limit: number;
  private bindings: Record<string, any>;
  private onChange?: (
    log: LogEntry | undefined,
    logs: LogEntry[],
    info: { depth: number },
  ) => void;
  level: LevelWithSilent;

  constructor(options: FifoLoggerOptions = {}) {
    this.uuids = [v4()];
    this.events = [];
    this.level = options.level || 'info';
    this.levelAsNumber = levels.values[this.level];
    this.limit = options.limit ?? 1000;
    this.bindings = options.bindings ?? {};
    this.onChange = options.onChange;
  }

  setLevel(level: LevelWithSilent) {
    this.level = level;
    this.levelAsNumber = levels.values[level];
  }

  setLimit(limit: number) {
    this.limit = limit;
    this.checkSize();
  }

  checkSize() {
    if (this.events.length > this.limit) {
      this.events.splice(0, this.events.length - this.limit);
    }
  }

  /**
   * Remove events from the current logger and its children.
   * @param options
   */
  clear() {
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].uuids.includes(this.uuids[0])) {
        this.events.splice(i, 1);
      }
    }
    this.onChange?.(undefined, this.events, { depth: this.uuids.length });
  }

  getLogs(
    options: {
      minLevel?: LevelWithSilent;
      level?: LevelWithSilent;
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
      const levelNumber = Number(levels.values[level]);
      if (Number.isNaN(levelNumber)) {
        throw new Error('Invalid level');
      }
      logs = logs.filter((log) => log.level === levelNumber);
    }
    if (minLevel) {
      const levelNumber = Number(levels.values[minLevel]);
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
    newFifoLogger.onChange = this.onChange;
    newFifoLogger.events = this.events;
    newFifoLogger.uuids = [v4(), ...this.uuids];
    newFifoLogger.level = this.level;
    newFifoLogger.bindings = { ...this.bindings, ...bindings };
    return newFifoLogger;
  }

  trace(obj: Record<string, unknown>, message: string): void;
  trace(message: string): void;
  trace(error: Error): void;
  trace(value: unknown, message?: string) {
    addEvent(this, levels.values.trace, value, message);
  }

  debug(obj: Record<string, unknown>, message: string): void;
  debug(message: string): void;
  debug(error: Error): void;
  debug(value: unknown, message?: string): void {
    addEvent(this, levels.values.debug, value, message);
  }

  info(obj: Record<string, unknown>, message: string): void;
  info(message: string): void;
  info(error: Error): void;
  info(value: unknown, message?: string): void {
    addEvent(this, levels.values.info, value, message);
  }

  warn(obj: Record<string, unknown>, message: string): void;
  warn(message: string): void;
  warn(error: Error): void;
  warn(value: unknown, message?: string): void {
    addEvent(this, levels.values.warn, value, message);
  }

  error(obj: Record<string, unknown>, message: string): void;
  error(message: string): void;
  error(error: Error): void;
  error(value: unknown, message?: string): void {
    addEvent(this, levels.values.error, value, message);
  }

  fatal(obj: Record<string, unknown>, message: string): void;
  fatal(message: string): void;
  fatal(error: Error): void;
  fatal(value: unknown, message?: string): void {
    addEvent(this, levels.values.fatal, value, message);
  }
}

function addEvent(
  logger: any,
  level: LevelNumber,
  value: unknown,
  message?: string,
) {
  if (level < logger.levelAsNumber) return;

  const event: Partial<LogEntry> = {
    level,
    levelLabel: levels.labels[level],
    time: Date.now(),
    uuids: logger.uuids,
  };
  if (value instanceof Error) {
    event.message = value.toString();
    event.error = value;
    event.meta = { ...logger.bindings };
  } else if (message && typeof value === 'object') {
    event.message = message;
    event.meta = { ...logger.bindings, ...value };
  } else if (!message && typeof value === 'string') {
    event.message = value;
    event.meta = { ...logger.bindings };
  } else {
    throw new Error('Invalid arguments');
  }

  logger.events.push(event);
  logger.checkSize();
  if (logger.onChange) {
    logger.onChange(event, logger.events, { depth: logger.uuids.length });
  }
}
