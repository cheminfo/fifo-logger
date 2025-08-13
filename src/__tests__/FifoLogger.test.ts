import type { BaseLogger } from 'pino';
import { throttle } from 'throttle-debounce';
import { describe, expect, it } from 'vitest';

import { FifoLogger } from '../FifoLogger.ts';
import type { LogEntry } from '../LogEntry.ts';
import type { LogEventData } from '../events.ts';

describe('FifoLogger', () => {
  it('test pino compatibility', () => {
    /*
    interface LogFn {
        // TODO: why is this different from `obj: object` or `obj: any`?
        <T extends object>(obj: T, msg?: string, ...args: any[]): void;
        (obj: unknown, msg?: string, ...args: any[]): void;
        (msg: string, ...args: any[]): void;
    }
    */

    //@ts-expect-error should be ok
    const logger: Omit<BaseLogger, 'silent'> = new FifoLogger();

    expect(logger.info).toBeDefined();
  });

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

    const errors = logger.getLogs({ minLevel: 'error' });

    expect(errors).toHaveLength(2);

    const oneError = logger.getLogs({ level: 'error' });

    expect(oneError).toHaveLength(1);
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

    logger.setLimit(4);
    logger.info('an info');
    logger.warn('a warning');
    logger.error('an error');
    logger.fatal('a fatal error');

    expect(logger.getLogs()).toHaveLength(4);

    logger.setLimit(2);

    expect(logger.getLogs()).toHaveLength(2);

    logger.setLevel('fatal');
    logger.info('an info');
    logger.warn('a warning');
    logger.error('an error');
    logger.fatal('a fatal error');

    expect(removeVariableValues(logger.getLogs())).toMatchSnapshot();

    const childLogger = logger.child();
    childLogger.fatal('a fatal error in a child');

    expect(logger.getLogs({ includeChildren: true })).toHaveLength(2);
    expect(
      removeVariableValues(logger.getLogs({ includeChildren: true })),
    ).toMatchSnapshot();
  });

  it('logger level', () => {
    const logger = new FifoLogger({ level: 'error' });
    logger.info('an info');
    logger.warn('a warning');
    logger.error('an error');
    logger.fatal('a fatal error');

    expect(logger.getLogs()).toHaveLength(2);

    const childLogger = logger.child();
    childLogger.warn('a warning');
    childLogger.error('an error');

    expect(childLogger.getLogs()).toHaveLength(1);

    expect(logger.getLogs({ includeChildren: true })).toHaveLength(3);
  });

  it('addEventListener', () => {
    const logger = new FifoLogger();
    const firstListener: LogEventData[] = [];
    const secondListener: string[] = [];
    const onceListener: string[] = [];
    logger.addEventListener('log', (event) => {
      firstListener.push(event.detail);
    });
    logger.addEventListener('log', (event) => {
      secondListener.push(event.detail.log.message);
    });
    logger.addEventListener(
      'log',
      (event) => {
        onceListener.push(event.detail.log.message);
      },
      { once: true },
    );
    logger.info('an info');
    logger.warn('a warning');
    logger.error('an error');
    logger.fatal('a fatal error');

    expect(firstListener.map((detail) => detail.log.message)).toStrictEqual([
      'an info',
      'a warning',
      'an error',
      'a fatal error',
    ]);
    expect(secondListener).toStrictEqual([
      'an info',
      'a warning',
      'an error',
      'a fatal error',
    ]);
    expect(onceListener).toStrictEqual(['an info']);
  });

  it('test types', () => {
    const logger = new FifoLogger();

    expect(() => {
      // @ts-expect-error should not be able to log without message
      logger.info();
    }).toThrow('Invalid arguments');
    expect(() => {
      // @ts-expect-error should not be able to log with 2 strings
      logger.info('a', 'b');
    }).toThrow('Invalid arguments');

    logger.info({}, '');

    expect(logger.getLogs()).toHaveLength(1);
  });

  it('logging message, object, error', () => {
    const logger = new FifoLogger();
    logger.info('an info');
    logger.info({ object: 'ab' }, 'an info with an object ');
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

    const ids = logger
      .getLogs({ includeChildren: true })
      .map((entry) => entry.id);

    expect(ids).toStrictEqual([1, 2, 3, 4]);
  });

  it('clear', () => {
    const messages: Array<string | undefined> = [];
    const depths: number[] = [];
    const logger = new FifoLogger();
    logger.addEventListener('change', (event) => {
      messages.push(event.detail.logs.at(-1)?.message);
      depths.push(event.detail.info.depth);
    });
    logger.info('an info');

    const child = logger.child();
    child.warn('a warn in a child');

    const grandchild = child.child();
    grandchild.error('an error in a grandchild');

    child.warn('another warn in a child');

    expect(logger.getLogs({ includeChildren: true })).toHaveLength(4);
    expect(child.getLogs({ includeChildren: true })).toHaveLength(3);
    expect(grandchild.getLogs({ includeChildren: true })).toHaveLength(1);

    child.clear();

    expect(logger.getLogs({ includeChildren: true })).toHaveLength(1);
    expect(child.getLogs({ includeChildren: true })).toHaveLength(0);
    expect(grandchild.getLogs({ includeChildren: true })).toHaveLength(0);

    expect(depths).toStrictEqual([1, 2, 3, 2, 2]);
    expect(messages).toStrictEqual([
      'an info',
      'a warn in a child',
      'an error in a grandchild',
      'another warn in a child',
      // After child.clear(), we are left with the first log on the root logger
      'an info',
    ]);
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
    const results: Array<string | number | undefined> = [];
    const logger = new FifoLogger();
    logger.addEventListener('change', (event) => {
      results.push(event.detail.logs.at(-1)?.message, event.detail.logs.length);
    });
    logger.info('first info');
    logger.info('second info');

    expect(results).toStrictEqual(['first info', 1, 'second info', 2]);

    const childLogger = logger.child();
    childLogger.info('info in child');

    expect(results).toStrictEqual([
      'first info',
      1,
      'second info',
      2,
      'info in child',
      3,
    ]);
  });

  it('onchange takes only depth 1', () => {
    const results: Array<string | number> = [];
    const logger = new FifoLogger();
    logger.addEventListener('change', (event) => {
      const log = event.detail.logs.at(-1);
      const info = event.detail.info;
      if (log && info.depth === 1) {
        results.push(log.message, event.detail.logs.length);
      }
    });
    logger.info('first info');
    logger.info('second info');

    expect(results).toStrictEqual(['first info', 1, 'second info', 2]);

    const childLogger = logger.child();
    childLogger.info('info in child');

    expect(results).toStrictEqual(['first info', 1, 'second info', 2]);
  });

  it('onchange with throttle', () => {
    const results: Array<number | string> = [];
    const throttleFunc = throttle(100, (log, logs) => {
      results.push(log.message, logs.length);
    });
    const logger = new FifoLogger();
    logger.addEventListener('change', (event) => {
      const log = event.detail.logs.at(-1);
      throttleFunc(log, event.detail.logs);
    });
    logger.info('first info');
    logger.info('second info');
    const start = Date.now();
    while (Date.now() - start < 120);
    logger.info('an info after 120ms');

    expect(results).toStrictEqual(['first info', 1, 'an info after 120ms', 3]);
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
