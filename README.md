# fifo-logger

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

Simple event logger for the browser and node.js inspired by `pino`.

By default it will keep the 10'000 last events that can easily be retrieved and filtered.

## Installation

`$ npm i fifo-logger`

## Simple usage

```js
import { FifoLogger } from 'fifo-logger';

const logger = new FifoLogger({
  limit: 1000, // default value
  level: 'info', // by default we will not log the level under 'info' (trace and debug)
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

A `child` logger may be created in order to store specific related logs. Each logger or child logger will receive a specific UUID.

```js
import { FifoLogger } from 'fifo-logger';

const logger = new FifoLogger();
logger.info('an info');

const childLogger = logger.child();
childLogger.info('from child');

const grandChildLogger = childLogger.child();
grandChildLogger.info('from grandchild');

const anotherLogger = logger.child();
anotherLogger.info('from another child');

console.log(logger.getLogs()); // 1 element
console.log(logger.getLogs({ includeChildren: true })); // 4 elements
console.log(childLogger.getLogs()); // 1 element
console.log(childLogger.getLogs({ includeChildren: true })); // 3 elements
```

## Callback when new logs are added

If you need to update the log list based on new addition you can add the `onChange` callback

```js
const logger = new FifoLogger({
  onChange: (log, logs, info) => {
    console.log(log, logs, info);
  },
});
logger.info('Hello world');

// info contains 'depth' starting at 1
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

## In the browser

```html
<html>
  <head>
    <script
      src="https://www.lactame.com/lib/fifo-logger/0.3.0/fifo-logger.js"
      type="text/javascript"
    ></script>
    <script Logger="fifo-logger" type="text/javascript">
      const logger = new FifoLogger.FifoLogger({
        onChange: (log, logs) => {
          console.log(logs);
          document.getElementById('logs').innerHTML =
            '<table><tr><th>Level</th><th>Message</th></tr>' +
            logs
              .map((log) => {
                return `<tr><td>${log.level}</td><td>${log.message}</td></tr>`;
              })
              .join('') +
            '</table>';
        },
      });
    </script>
  </head>
  <body>
    <button onclick="logger.warn('warning')">Warning</button>
    <div id="logs"></div>

    <script>
      logger.info('Hello World!');
      logger.error('This is an error');
    </script>
  </body>
</html>
```

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
