import pino, { Logger } from 'pino';

import { FifoLoggerOptions, LogEntry } from './FifoLogger';

export function getPino(
  events: any[],
  options: FifoLoggerOptions = {},
): Logger {
  const realOptions = { limit: 1000, level: 'info', ...options };

  return pino(
    {
      level: realOptions.level,
      base: {},
      // messageKey: 'message', // seems it is not taken into account in browser
      // errorKey: 'error',
      // nestedKey: 'meta',
      browser: {
        write: (event) => {
          addEvent(events, event, realOptions);
        },
      },
    },
    {
      write: (event) => {
        addEvent(events, JSON.parse(event), realOptions);
      },
    },
  );
}

function addEvent(
  events: any[],
  event: any,
  options: {
    limit: number;
    onChange?: (log: LogEntry, logs: LogEntry[]) => void;
  },
) {
  const { level, context, time, msg, err, ...rest } = event;
  const { limit, onChange } = options;
  const realEvent = {
    level,
    time,
    context,
    message: msg,
    error: err,
    meta: rest,
  };

  events.push(realEvent);
  if (events.length > limit) {
    events.shift();
  }
  if (onChange) {
    onChange(realEvent, events);
  }
}
