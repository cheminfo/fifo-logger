import pino, { Logger } from 'pino';

export function getPino(
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
