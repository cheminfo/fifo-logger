import { FifoLogger } from '../FifoLogger';

test('FifoLogger', () => {
  const logger = new FifoLogger();
  // we can directly log at the level of the logger, we hide the fact that we are using pino
  logger.info('This is an info');

  // if we are using a library that logs in pino we can sent the pino instance
  const pino = logger.getPino();
  pino.warn('This is a warning with object');
  pino.warn({ a: 1, b: 2, c: 'Hello' }, 'This is a warning');

  // we can also get a child logger, by default it will use a random uuid
  const child = logger.child();
  child.error('This is an error in a child');
  child.fatal(new Error('Fatal error'));
  // logs are added in the parent logger but can be filtered at the level of the child
  const childPino = child.getPino();
  childPino.info('This is an info in a child pino');

  const allLogs = logger.getLogs();
  expect(allLogs).toHaveLength(6);

  const contextLogs = allLogs.filter((log) => log.context);
  expect(contextLogs).toHaveLength(3);

  expect(
    allLogs.map((log) => ({
      message: log.message,
      meta: log.meta,
      level: log.level,
      levelLabel: log.levelLabel,
    })),
  ).toMatchSnapshot();

  const childLogs = child.getLogs();

  console.log(JSON.stringify(allLogs, null, 2));

  expect(childLogs).toHaveLength(3);
  expect(
    childLogs.map((log) => ({ message: log.message, meta: log.meta })),
  ).toMatchSnapshot();

  const atLeastErrorLogs = child.getLogs({ minLevel: 'error' });
  expect(atLeastErrorLogs).toHaveLength(2);

  const errorLogs = child.getLogs({ level: 'error' });
  expect(errorLogs).toHaveLength(1);

  const containsErrorObject = allLogs.filter((log) => log.error);
  expect(containsErrorObject).toHaveLength(1);
});
