import * as events from 'events';
import * as http from 'http';
import * as https from 'https';

// tslint:disable-next-line no-require-imports
const JSONParse = require('try-json-parse');

// tslint:disable-next-line no-require-imports
const jsonStringifySafe = require('json-stringify-safe');

import {UserProxyConfig} from './interfaces/userProxyConfig';
import * as utils from './utils';
import {SendOptions} from './interfaces/sendOptions';
import {TransportSendOptions} from './interfaces/transportSendOptions';
import {BUGS_PATH} from './consts/constants';

export class HTTPTransport extends events.EventEmitter {
  static DJATY_NOT_SUPPORTED_REDIRECTION = 'DJATY_NOT_SUPPORTED_REDIRECTION';

  private transport: typeof http | typeof https;

  private readonly reqOptions: http.RequestOptions;

  constructor(private options: SendOptions) {
    super();
    const {server, proxy} = options;
    const {secure, apiPath, port} = server;
    this.transport = secure ? https : http;

    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
    };

    const initOpts: http.RequestOptions = {path: `${apiPath}${BUGS_PATH}`, headers, method, port};

    const reqProxy = proxy ? HTTPTransport.getProxyReqOptions(headers, proxy) : {};

    this.reqOptions = Object.assign({}, initOpts, server, reqProxy);
  }

  send({data, isReport}: TransportSendOptions, cb: (err?: utils.RequestError) => void) {
    const strData = jsonStringifySafe(data);
    const reqOptions = this.getReqOptions(isReport);

    // The callback parameter will be added as a one time listener for the 'response' event.
    const req = (<typeof http>this.transport)
      .request(reqOptions, (res: http.IncomingMessage) => {

        res.setEncoding('utf8');

        let resBody = '';
        res.on('data', chunk => {
          resBody += chunk;
        });

        res.on('end', () => {
          const statusCode = res.statusCode;

          const location = HTTPTransport.findHeaderVal('location', res.headers);
          if (statusCode && statusCode >= 300 && statusCode < 400 && location) {
            const reqErr = new utils.RequestError(`Cannot redirect to ${location}. ` +
            'Redirections are not supported');

            reqErr.code = HTTPTransport.DJATY_NOT_SUPPORTED_REDIRECTION;

            return cb(reqErr);
        }

          resBody = resBody.replace(/^\)]}'[^\n]*\n/, '');
          const resBodyObj = JSONParse(resBody) || resBody;

          // `resBodyObj[0].errors` indicates invalid batch item.
          // @TODO, we need to deal with buffer manager to manage batch items
          const resErrors = resBodyObj.invalidBugPatchItemList &&
            resBodyObj.invalidBugPatchItemList[0].errors || resBodyObj.errors;

          if (statusCode && statusCode >= 200 && statusCode < 300 && !resErrors) {
            return cb();
          }

          const reason = resErrors || (resBodyObj.code &&
            `${resBodyObj.code} (${resBodyObj.message})`) || 'No reason specified!';

          const err = new utils.RequestError(`HTTP Error ${statusCode ? `(${statusCode})` : ''}`);
          err.reqBody = JSONParse(strData) || strData;
          err.reasons = reason;
          err.resBody = resBodyObj;
          err.statusCode = statusCode;

          if (HTTPTransport.isServerErr(err)) {
            utils.consoleAlertError(`Request failed with statusCode ${statusCode}.`);
            // @TODO RETRY if the status 500 of the code one of the following.
            // If failed finally, log "Cannot reach the server. Server or proxy
            // config may be incorrect"
            // Use request module for easy implementation.

            return;
          }

          return cb(err);
        });
      });

    let cbFired = false;
    req.on('error', (err: (Error & {code: string, reqBody: any})) => {
      if (!cbFired) {
        const formattedErr = new utils.RequestError(err.message);
        formattedErr.stack = err.stack;
        if (err.code) {
          formattedErr.code = err.code;
        }

        if (HTTPTransport.isServerErr(err)) {
          utils.consoleAlertError(`Request failed with code ${err.code}.`);
          // @TODO RETRY if the status 500 of the code one of the following.
          // If failed finally, log "Cannot reach the server. Server or proxy
          // config may be incorrect"
          // Use request module for easy implementation.

          return;
        }

        cb(formattedErr);
        cbFired = true;
      }
    });

    req.end(strData);
  }

  private static getProxyReqOptions(headers: object, proxy: UserProxyConfig) {
    const host = proxy.hostname;
    const proxyHeaders = {...headers, Host: proxy.hostname};
    const secure = proxy.secure;

    let port = proxy.port;

    if (!port && secure) {
      port = 443;
    }

    if (!port && !secure) {
      port = 80;
    }

    return {
      headers: proxyHeaders,
      host,
      secure,
      port,
    };
  }

  /**
   * Find header and return its value (Case insensitive)
   * @param {string} targetHeader
   * @param headerMap
   * @returns {string}
   */
  private static findHeaderVal(targetHeader: string, headerMap: {[p: string]: string}) {
    const headerList = Object.keys(headerMap);
    const LowerCaseHeader = targetHeader.toLowerCase();
    const headerIndex = headerList.findIndex(header => header.toLowerCase() === LowerCaseHeader);
    return headerMap[headerList[headerIndex]];
  }

  private static isServerErr(err: utils.RequestError) {
    // Please don't consider `ECONNREFUSED` as a one of them as we handle it differently.
    const serverErrRetryList = ['ESOCKETTIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET', 'ETIMEDOUT'];

    return serverErrRetryList.includes(err.code!) || err.statusCode! >= 500;
  }

  private getReqOptions(isCrashReport?: boolean) {
    return isCrashReport ? Object.assign({}, this.reqOptions, {
      path: `${this.reqOptions.path}?reportedAgent=nodeJsBackendAgent`,
    }) : this.reqOptions;
  }
}
