import { v4 } from '@lukeed/uuid';
import { TypedEventTarget } from 'typescript-event-target';

import { LogEntry } from './LogEntry';
import { LogEvent } from './LogEvent';
import { LevelNumber, LevelWithSilent, levels } from './levels';

export interface FifoLoggerOptions {
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
}

interface LoggerEventMap {
  log: LogEvent;
}

/**
 * A FIFO logger that stores the last events in an array.
 */

export class FifoLogger extends TypedEventTarget<LoggerEventMap> {
  private lastID: { id: number };
  private initialOptions: FifoLoggerOptions;
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
    super();
    this.lastID = { id: 0 };
    this.initialOptions = options;
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
    const newFifoLogger = new FifoLogger(this.initialOptions);
    newFifoLogger.events = this.events;
    newFifoLogger.uuids = [v4(), ...this.uuids];
    newFifoLogger.lastID = this.lastID;
    newFifoLogger.bindings = { ...this.bindings, ...bindings };
    return newFifoLogger;
  }

  trace(obj: Record<string, unknown>, message: string): void;
  trace(message: string): void;
  trace(error: Error): void;
  trace(value: unknown, message?: string) {
    this.#addEvent(levels.values.trace, value, message);
  }

  debug(obj: Record<string, unknown>, message: string): void;
  debug(message: string): void;
  debug(error: Error): void;
  debug(value: unknown, message?: string): void {
    this.#addEvent(levels.values.debug, value, message);
  }

  info(obj: Record<string, unknown>, message: string): void;
  info(message: string): void;
  info(error: Error): void;
  info(value: unknown, message?: string): void {
    this.#addEvent(levels.values.info, value, message);
  }

  warn(obj: Record<string, unknown>, message: string): void;
  warn(message: string): void;
  warn(error: Error): void;
  warn(value: unknown, message?: string): void {
    this.#addEvent(levels.values.warn, value, message);
  }

  error(obj: Record<string, unknown>, message: string): void;
  error(message: string): void;
  error(error: Error): void;
  error(value: unknown, message?: string): void {
    this.#addEvent(levels.values.error, value, message);
  }

  fatal(obj: Record<string, unknown>, message: string): void;
  fatal(message: string): void;
  fatal(error: Error): void;
  fatal(value: unknown, message?: string): void {
    this.#addEvent(levels.values.fatal, value, message);
  }

  #addEvent(level: LevelNumber, value: unknown, message?: string) {
    if (level < this.levelAsNumber) return;

    const event: LogEntry = {
      id: ++this.lastID.id,
      level,
      levelLabel: levels.labels[level],
      time: Date.now(),
      uuids: this.uuids,
      message: '',
    };
    if (value instanceof Error) {
      event.message = value.toString();
      event.error = value;
      event.meta = { ...this.bindings };
    } else if (message !== undefined && typeof value === 'object') {
      event.message = message;
      event.meta = { ...this.bindings, ...value };
    } else if (message === undefined && typeof value === 'string') {
      event.message = value;
      event.meta = { ...this.bindings };
    } else {
      throw new Error('Invalid arguments');
    }

    this.events.push(event);
    this.checkSize();

    this.dispatchTypedEvent(
      'log',
      new LogEvent({
        log: event,
        logs: this.events,
        info: { depth: this.uuids.length },
      }),
    );

    if (this.onChange) {
      this.onChange(event, this.events, { depth: this.uuids.length });
    }
  }
}
