# fifo-logger

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

Simple event logger for the browser and node.js that wraps `pino`.

By default it will keep the 10'000 last events that can easily be retrieved and filtered.

## Installation

`$ npm i fifo-logger`

## Simple usage

```js
import { FifoLogger } from 'fifo-logger';

const logger = new Logger({
  limit: 1000, // default value
  level: 'info', // default value
});

logger.trace('a trace');
logger.debug('a debug');
logger.info('an info');
logger.warn('a warning');
logger.error('a error');
logger.fatal('fatal');

// you have also the possibility to log an object or object + message

logger.warn({ a: 1, b: 2, c: 'Hello' }, 'a warning');

// errors can also be directly added to the logger

logger.fatal(new Error('a fatal error'));

// to get the logs

const logs = logger.getLogs();
```

## Logging in a specific context

A `child` logger may be created in order to store specific related logs. By default the child process will receive a 'context' property that contains a uuid

```js
import { FifoLogger } from 'fifo-logger';

const logger = new Logger();

logger.info('an info');

const childLogger = logger.child();

const anotherLogger = logger.child();
```

## Callback when new logs are added

If you need to update the log list based on new addition you can add the `onChange` callback

```js
const logger = new FifoLogger({
  onChange: (log, logs) => {
    console.log(log, logs);
  },
});
```

## Callback with throttling

Libraries may be quite verbose and you can throttle the callback using such a code

```js
import { throttle } from 'throttle-debounce';

import { FifoLogger } from 'fifo-logger';

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

console.log(results);
// ['first info', 1, 'an info after 120ms', 3]
```

    ##

## License

[MIT](./LICENSE)

[npm-image]: https://img.shields.io/npm/v/fifo-logger.svg
[npm-url]: https://www.npmjs.com/package/fifo-logger
[ci-image]: https://github.com/cheminfo/fifo-logger/workflows/Node.js%20CI/badge.svg?branch=main
[ci-url]: https://github.com/cheminfo/fifo-logger/actions?query=workflow%3A%22Node.js+CI%22
[codecov-image]: https://img.shields.io/codecov/c/github/cheminfo/fifo-logger.svg
[codecov-url]: https://codecov.io/gh/cheminfo/fifo-logger
[download-image]: https://img.shields.io/npm/dm/fifo-logger.svg
[download-url]: https://www.npmjs.com/package/fifo-logger

```

```
