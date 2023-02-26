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

  it('child and grandchild', () => {
    const logger = new FifoLogger();
    // we can directly log at the level of the logger, we hide the fact that we are using pino
    logger.info('an info');

    // we can also get a child logger, by default it will use a random uuid
    const child = logger.child();
    child.warn('a warn in a child');

    const grandchild = child.child();
    grandchild.error('an error in a grandchild');

    child.warn('another warn in a child');

    expect(logger.getLogs()).toHaveLength(1);
    expect(logger.getLogs({ includeChildren: true })).toHaveLength(4);

    expect(child.getLogs()).toHaveLength(2);
    expect(child.getLogs({ includeChildren: true })).toHaveLength(3);
    expect(grandchild.getLogs()).toHaveLength(1);
    expect(grandchild.getLogs({ includeChildren: true })).toHaveLength(1);
  });

  it('error', () => {
    const logger = new FifoLogger();
    logger.info('an info');

    logger.fatal(new Error('Fatal error'));

    const child = logger.child();
    child.fatal(new Error('fatal error in child'));

    const containsErrorObject = logger
      .getLogs({ includeChildren: true })
      .filter((log) => log.error);
    expect(containsErrorObject).toHaveLength(2);
  });

  it('child with custom properties', () => {
    const logger = new FifoLogger();
    logger.info({ a: 1 }, 'an info');
    const child = logger.child({ a: 2, b: 4 });
    child.warn('a warn in a child');
    const grandchild = child.child({ a: 3, c: 5 });
    grandchild.error('an error in a grandchild');

    const metas = logger
      .getLogs({ includeChildren: true })
      .map((log) => log.meta);

    expect(metas).toStrictEqual([
      { a: 1 },
      { a: 2, b: 4 },
      { a: 3, b: 4, c: 5 },
    ]);
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

function removeVariableValues(logs: LogEntry[]) {
  return logs.map((log) => ({
    ...log,
    time: 42,
    uuids: log.uuids.length,
    error: log.error ? { message: 'Message', name: 'Name' } : undefined,
  }));
}
