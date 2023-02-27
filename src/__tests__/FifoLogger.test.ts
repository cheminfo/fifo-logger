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

  it('logging message, object, error', () => {
    const logger = new FifoLogger();
    logger.info('an info');
    logger.info({ object: 'ab' }, 'an info with an object ');
    logger.trace('a', 'trace');
    const logs = logger.getLogs();
    expect(
      logs.map((log) => ({ meta: log.meta, message: log.message })),
    ).toStrictEqual([
      { message: 'an info', meta: {} },
      { message: 'an info with an object ', meta: { object: 'ab' } },
    ]);
    expect(removeVariableValues(logs)).toMatchSnapshot();
  });

  it('child and grandchild', () => {
    const logger = new FifoLogger();
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

  it('bindings', () => {
    // it is possible to have some default parameters for all logs and this can be overwriten by the child

    const logger = new FifoLogger({ bindings: { namespace: 'base' } });
    logger.warn('a warning with object');
    logger.warn({ c: 'Hello' }, 'a warning');

    const loggerChild = logger.child({ namespace: 'child', a: 1 });
    loggerChild.info('from loggerChild');
    const loggerSubChild = loggerChild.child({ namespace: 'subchild', b: 2 });
    loggerSubChild.info('from loggerSubChild');

    expect(
      logger
        .getLogs({ includeChildren: true })
        .map((log) => ({ message: log.message, meta: log.meta })),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "a warning with object",
          "meta": {
            "namespace": "base",
          },
        },
        {
          "message": "a warning",
          "meta": {
            "c": "Hello",
            "namespace": "base",
          },
        },
        {
          "message": "from loggerChild",
          "meta": {
            "a": 1,
            "namespace": "child",
          },
        },
        {
          "message": "from loggerSubChild",
          "meta": {
            "a": 1,
            "b": 2,
            "namespace": "subchild",
          },
        },
      ]
    `);
  });

  it('onchange', () => {
    const results: any = [];
    const logger = new FifoLogger({
      onChange: (log, logs) => {
        results.push(log.message);
        results.push(logs.length);
      },
    });
    logger.info('first info');
    logger.info('second info');
    expect(results).toEqual(['first info', 1, 'second info', 2]);
    const childLogger = logger.child();
    childLogger.info('info in child');
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
