import { WebEventLogger } from '../WebEventLogger';

test('WebEventLogger', () => {
  const webEventLogger = new WebEventLogger();
  webEventLogger.info('test');

  const pino = webEventLogger.getPino();
  pino.info('test');
  pino.info({ a: { d: 1, e: 2 }, b: 2, c: 3 });

  const child = pino.child({ uuid: 'uuid' });
  child.info('test');

  console.log(webEventLogger.getLogs());
  //  pino.info(new Error('test error'));
  //console.log(webEventLogger);
});
