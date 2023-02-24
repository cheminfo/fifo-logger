# fifo-logger

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

Simple event logger for the browser and node.js that wraps `pino`.

## Installation

`$ npm i fifo-logger`

## Simple usage

```js
import { FifoLogger } from 'fifo-logger';

const logger = new Logger({
  limit: 10000, // default value
  level: 'info', // default value
});

logger.trace('This is an trace');
logger.debug('This is an debug');
logger.info('This is an info');
logger.warn('This is a warning');
logger.error('This is a error');
logger.fatal('This is fatal');

// you have also the possibility to log an object or object + message

logger.warn({ a: 1, b: 2, c: 'Hello' }, 'This is a warning');

// errors can also be directly added to the logger

logger.fatal(new Error('This is a fatal error'));

// to get the logs

const logs = logger.getLogs();
```

## License

[MIT](./LICENSE)

[npm-image]: https://img.shields.io/npm/v/logger.svg
[npm-url]: https://www.npmjs.com/package/logger
[ci-image]: https://github.com/cheminfo/logger/workflows/Node.js%20CI/badge.svg?branch=main
[ci-url]: https://github.com/cheminfo/logger/actions?query=workflow%3A%22Node.js+CI%22
[codecov-image]: https://img.shields.io/codecov/c/github/cheminfo/logger.svg
[codecov-url]: https://codecov.io/gh/cheminfo/logger
[download-image]: https://img.shields.io/npm/dm/logger.svg
[download-url]: https://www.npmjs.com/package/logger
