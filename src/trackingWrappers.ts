import * as util from 'util';
import * as winston from 'winston';
import * as debug from 'debug';
import * as _ from 'lodash';

import {DJATY_ALERTS_PREFIX} from './consts/constants';
import {TrackingWrappers} from './interfaces/trackingWrappers';
import {OrigFn} from './interfaces/origFn';
import {LoggerInstanceConfig} from './interfaces/loggerInstanceConfig';
import {DjatyDomain} from './interfaces/djatyDomain';
import {TimelineItemTypes} from './interfaces/timelineItemTypes';
import * as utils from './utils';
import {DjatyWinstonTransport} from './customLogger/djatyWinstonTransport';
import {DjatyInterface} from './interfaces/djatyInterface';

// tslint:disable-next-line no-require-imports
const domain = <DjatyDomain> require('domain');

/**
 * Polyfill a method
 *
 * @param obj: Object e.g. `document`
 * @param name: Method name present on object e.g. `addEventListener`
 * @param replacement: Replacement function
 * @param track: Optional, record instrumentation to an array
 */
export function fill(obj: any, name: string, replacement: Function,
                     track?: OrigFn[]) {

  const orig = obj[name];
  obj[name] = replacement(orig);
  if (track instanceof Array) {
    track.push({obj, name, orig});
  }
}

export const allowedConsoleMethods = ['debug', 'info', 'warn', 'error', 'log'];

/**
 * Array of original functions
 * @type {Array}
 */
export const originals: OrigFn[] = [];

// noinspection JSUnusedLocalSymbols
const customLoggers = {
  winston(djaty: DjatyInterface, options: LoggerInstanceConfig) {
    const restOpts = <any> _.omit(options, ['name']);

    fill(winston, 'createLogger', (origCreateLogger: Function) => (opts: winston.LoggerOptions) => {
      return origCreateLogger
        .call(winston, opts)
        .add(new DjatyWinstonTransport({silent: false, level: 'debug', djaty, ...restOpts}));
    }, originals);
  },

  debug (djaty: DjatyInterface, options: LoggerInstanceConfig) {
    if (debug.enabled) {
      // @TODO
    }
  },
};

const wrappers: TrackingWrappers = {
  stdLogs(djaty: DjatyInterface) {
    fill(process.stdout, 'write', (originalStdMethod: Function) => (...stdParams: any[]) => {
      const param = stdParams[0];
      if (util.isString(param) && param.match(new RegExp(`^${DJATY_ALERTS_PREFIX}`))) {
        return originalStdMethod.apply(process.stdout, stdParams);
      }

      originalStdMethod.apply(process.stdout, stdParams);

      const consoleItem = utils.formatConsoleItem('log', stdParams);
      djaty.trackTimelineItem(domain.active, consoleItem);

    }, originals);

    fill(process.stderr, 'write', (originalStdMethod: Function) => (...stdParams: any[]) => {
      const param = stdParams[0];
      if (util.isString(param) && param.match(new RegExp(`^${DJATY_ALERTS_PREFIX}`))) {
        return originalStdMethod.apply(process.stderr, stdParams);
      }

      originalStdMethod.apply(process.stderr, stdParams);

      const consoleItem = utils.formatConsoleItem('error', stdParams);
      djaty.trackTimelineItem(domain.active, consoleItem);
    }, originals);
  },

  console(djaty: DjatyInterface) {
    function wrapConsoleMethod (methodName: string) {
      if (!(methodName in console)) {
        return;
      }

      fill(console, methodName, (originalConsoleMethod: Function) => (...consoleParams: any[]) => {
        const param = consoleParams[0];
        if (util.isString(param) && param.match(new RegExp(DJATY_ALERTS_PREFIX))) {
          return originalConsoleMethod.apply(console, consoleParams);
        }

        originalConsoleMethod.apply(console, consoleParams);

        const consoleItem = utils.formatConsoleItem(methodName, consoleParams);
        djaty.trackTimelineItem(domain.active, consoleItem);
      }, originals);
    }

    allowedConsoleMethods.forEach(wrapConsoleMethod);
  },

  http(djaty: DjatyInterface) {
    // Require on the need
    // tslint:disable-next-line no-require-imports
    const http = require('http');
    const OrigClientRequest = http.ClientRequest;
    const ClientRequest = function (options: any, cb: Function) {
      // @TODO: We need to capture a timeline item if a response never comes.
      OrigClientRequest.call(this, options, cb);

      // We could just always reconstruct this from this.agent, this.path, etc
      // but certain other http-instrumenting libraries (like nock, which we use for tests) fail to
      // maintain the guarantee that after calling OrigClientRequest, those fields will be populated
      if (typeof options === 'string') {
        // noinspection JSUnusedGlobalSymbols
        this.__djatyReqItemUrl = options;
      } else {
        // noinspection JSUnusedGlobalSymbols
        this.__djatyReqItemUrl = (options.protocol || '') + '//' +
          (options.hostname || options.host || '') +
          ((options.port !== 443 && options.port !== 80) ? ':' + options.port : '') +
          (options.path || '/');
      }

      // noinspection JSUnusedGlobalSymbols
      this.__djatyReqStartTime = Date.now();
    };

    util.inherits(ClientRequest, OrigClientRequest);

    fill(ClientRequest.prototype, 'emit', (origEmit: Function) => {
      return function (evt: string, maybeResp: any) {
        if (evt === 'response' && this.__djatyReqItemUrl) {
          // Don't capture timeline requests for ours
          if (!djaty.isInitiated ||
            this.__djatyReqItemUrl.indexOf(djaty.getDjatyHostName()) === -1) {
            djaty.trackTimelineItem(domain.active, {
              itemType: TimelineItemTypes.HTTP_REQ,
              method: this.method,
              url: this.__djatyReqItemUrl,
              status: maybeResp.statusCode,
              statusText: maybeResp.statusMessage,
              requestTime: Date.now() - this.__djatyReqStartTime,
              timestamp: +new Date(),
            });
          }
        }

        return origEmit.apply(this, arguments);
      };
    });

    fill(http, 'ClientRequest', function () {
      return ClientRequest;
    }, originals);

    // http.request orig refs module-internal ClientRequest, not exported one, so
    // it still points at orig ClientRequest after our monkey-patch; these re-impls
    // just get that reference updated to use our new ClientRequest
    fill(http, 'request', function () {
      return (options: any, cb: Function) => {
        return new http.ClientRequest(options, cb);
      };
    }, originals);

    fill(http, 'get', () => {
      return (options: any, cb: Function) => {
        const req = http.request(options, cb);
        req.end();
        return req;
      };
    }, originals);
  },

  customLoggers(djaty: DjatyInterface, customLoggerOptions: [LoggerInstanceConfig]) {
    customLoggerOptions.forEach(loggerConfig => {
      const loggerName = loggerConfig.name;

      const loggerWrapper =
        (<{[p: string]: (djaty: DjatyInterface, opts?: any) => any}>customLoggers)[loggerName];

      if (!loggerWrapper) {
        throw new utils.DjatyError(`Associated logger ${loggerName} is not available!`);
      }

      loggerWrapper(djaty, loggerConfig);
    });
  },
};

export function instrument({key, wrapperOpts}: {key: string, wrapperOpts?: any},
                           djaty: DjatyInterface) {

  const wrapperModule = wrappers[key];
  if (!wrapperModule) {
    throw new utils.DjatyError(`Associated module ${key} does not available!`);
  }

  if (wrapperOpts) {
    wrappers[key](djaty, wrapperOpts);
    return;
  }

  wrappers[key](djaty);
}

export function restoreOriginals() {
  let original;
  // tslint:disable-next-line no-conditional-assignment
  while (original = originals.shift()) {
    const {obj, name, orig} = original;
    obj[name] = orig;
  }
}
