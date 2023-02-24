import { v4 } from '@lukeed/uuid';
import pino, { Logger } from 'pino';

type WebEventLoggerOptions = {
  /**
   * The maximum number of events to store.
   * @default 10000
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
   * The events array to store the events in.
   * @private
   */
  events?: any[];
  /**
   *  The pino instance to use.
   * @private
   */
  pino?: Logger;
};

export class WebEventLogger {
  private events: any[];
  private pino: Logger;

  constructor(options: WebEventLoggerOptions = {}) {
    const {
      limit = 10000,
      level = 'info',
      events = [],
      pino = getWebPino(events, { limit, level }),
    } = options;
    this.events = events;
    this.pino = pino;
  }

  getPino(): Logger {
    return this.pino;
  }

  getLogs() {
    return this.events;
  }

  trace(...args: any[]) {
    this.pino.trace(...args);
  }

  debug(...args: any[]) {
    this.pino.debug(...args);
  }

  info(...args: any[]) {
    this.pino.info(...args);
  }

  warn(...args: any[]) {
    this.pino.warn(...args);
  }

  error(...args: any[]) {
    this.pino.error(...args);
  }

  fatal(...args: any[]) {
    this.pino.fatal(...args);
  }
}

function getWebPino(
  events: any[],
  options: { level: string; limit: number },
): Logger {
  return pino(
    {
      level: options.level,
      base: {},
      browser: {
        write: (o) => {
          addEvent(events, o, options);
        },
      },
    },
    {
      write: (o) => {
        addEvent(events, o, options);
      },
    },
  );
}

function addEvent(events: any[], event: any, options: { limit?: number } = {}) {
  const { limit = 10000 } = options;
  events.push(event);
  if (events.length > limit) {
    events.shift();
  }
}
