import { Logger } from '..';

describe('Logger', () => {
  it('create class', () => {
    const logger = new Logger();
    logger.info('Hello world');

    const contextLogger = logger.inContext('uuid');
    contextLogger.info('Hello world in uuid context');

    const error = new Error();
    contextLogger.error('Error in uuid context', error);

    console.table(logger.logs);
  });
});
