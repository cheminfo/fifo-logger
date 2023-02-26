import pino, { Logger, levels } from 'pino';

import { FifoLoggerOptions, LogEntry } from './FifoLogger';

export function getPino(
  events: any[],
  uuids: string[],
  options: FifoLoggerOptions = {},
): Logger {
  const realOptions = { limit: 1000, level: 'info', uuids, ...options };
  return pino(
    {
      level: realOptions.level,
      base: {}, // seems not taken into account in browser, we can not place uuids here. Needs to add some hacks
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
    uuids: string[];
  },
) {
  const { level, time, msg, err, uuids, ...rest } = event;
  const { limit, onChange } = options;
  const realEvent: LogEntry = {
    level,
    levelLabel: levels.labels[level],
    time,
    uuids: uuids || options.uuids, // more hacks to be able to use pino in the browser and in nodejs
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
