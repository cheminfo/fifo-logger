import { throttle } from 'throttle-debounce';

import { FifoLogger, LogEntry } from '../FifoLogger';

describe('FifoLogger', () => {
  it('simple case, default level and limit', () => {
    const logger = new FifoLogger();
    logger.trace('a trace');
    logger.debug('a debug');
    logger.info('an info');
    logger.warn('a warning');
    logger.error('an error');
    logger.fatal('a fatal error');

    const logs = logger.getLogs();
    expect(logs.map((log) => log.message)).toStrictEqual([
      'an info',
      'a warning',
      'an error',
      'a fatal error',
    ]);
    expect(removeVariableValues(logs)).toMatchSnapshot();
  });

  it('simple case, limit 2', () => {
    const logger = new FifoLogger({ limit: 2 });
    logger.info('an info');
    logger.warn('a warning');
    logger.error('an error');
    logger.fatal('a fatal error');

    const logs = logger.getLogs();
    expect(logs.map((log) => log.message)).toStrictEqual([
      'an error',
      'a fatal error',
    ]);

    expect(removeVariableValues(logs)).toMatchSnapshot();
  });

  it('using pino and pino child', () => {
    const logger = new FifoLogger();
    // if we are using a library that logs in pino we can sent the pino instance
    const pino = logger.getPino();
    pino.warn('a warning with object');
    pino.warn({ c: 'Hello' }, 'a warning');

    const pinoChild = pino.child({ namespace: 'a', a: 1 });
    pinoChild.info('from pinoChild');
    const pinoSubChild = pinoChild.child({ namespace: 'b', b: 2 });
    pinoSubChild.info('from pinoSubChild');

    expect(
      logger.getLogs().map((log) => ({ message: log.message, meta: log.meta })),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "a warning with object",
          "meta": {},
        },
        {
          "message": "a warning",
          "meta": {
            "c": "Hello",
          },
        },
        {
          "message": "from pinoChild",
          "meta": {
            "a": 1,
            "namespace": "a",
          },
        },
        {
          "message": "from pinoSubChild",
          "meta": {
            "a": 1,
            "b": 2,
            "namespace": "b",
          },
        },
      ]
    `);
  });

  it('child', () => {
    const logger = new FifoLogger();
    // we can directly log at the level of the logger, we hide the fact that we are using pino
    logger.info('an info');

    // we can also get a child logger, by default it will use a random uuid
    const child = logger.child();
    child.error('an error in a child');
    child.fatal(new Error('Fatal error'));

    const allLogs = logger.getLogs();
    expect(allLogs).toHaveLength(3);

    const contextLogs = allLogs.filter((log) => log.context);
    expect(contextLogs).toHaveLength(2);

    expect(removeVariableValues(allLogs)).toMatchSnapshot();

    const childLogs = child.getLogs();

    expect(childLogs).toHaveLength(2);
    expect(removeVariableValues(childLogs)).toMatchSnapshot();

    const atLeastErrorLogs = child.getLogs({ minLevel: 'error' });
    expect(atLeastErrorLogs).toHaveLength(2);

    const errorLogs = child.getLogs({ level: 'error' });
    expect(errorLogs).toHaveLength(1);

    const containsErrorObject = allLogs.filter((log) => log.error);
    expect(containsErrorObject).toHaveLength(1);
  });

  it('onchange', () => {
    let results: any = [];
    const logger = new FifoLogger({
      onChange: (log, logs) => {
        results.push(log.message);
        results.push(logs.length);
      },
    });
    // we can directly log at the level of the logger, we hide the fact that we are using pino
    logger.info('first info');
    logger.info('second info');
    expect(results).toEqual(['first info', 1, 'second info', 2]);
  });

  it('onchange with throttle', () => {
    let results: any = [];
    let throttleFunc = throttle(100, (log, logs) => {
      results.push(log.message);
      results.push(logs.length);
    });
    const logger = new FifoLogger({
      onChange: throttleFunc,
    });
    // we can directly log at the level of the logger, we hide the fact that we are using pino
    logger.info('first info');
    logger.info('second info');
    const start = Date.now();
    while (Date.now() - start < 120);
    logger.info('an info after 120ms');
    expect(results).toEqual(['first info', 1, 'an info after 120ms', 3]);
  });
});

function removeVariableValues(logs: LogEntry[]): LogEntry[] {
  return logs.map((log) => ({
    ...log,
    time: 42,
    context: log.context ? 'context' : undefined,
    error: log.error ? { message: 'Message', name: 'Name' } : undefined,
  }));
}
