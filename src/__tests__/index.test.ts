import { Logger } from '..';

describe('Logger', () => {
  it('create class', () => {
    const logger = new Logger();
    logger.info('Hello world');

    const contextLogger1 = logger.inContext('uuid 1');
    contextLogger1.info('Hello world in uuid context 1');

    const contextLogger2 = logger.inContext('uuid 2');
    contextLogger2.info('Hello world in uuid context 2');

    const error1 = new Error();
    contextLogger1.error('Error in uuid context 1', error1);

    const error2 = new Error();
    contextLogger2.error('Error in uuid context 1', error2);

    console.table(logger.getLogs({ context: 'uuid 1' }));

    console.table(contextLogger2.getLogs({ context: 'uuid 1' }));
  });
});
