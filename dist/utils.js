"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const urlParser = require("url");
const _ = require("lodash");
const crypto = require("crypto");
const tls_1 = require("tls");
const constants_1 = require("./consts/constants");
const timelineItemTypes_1 = require("./interfaces/timelineItemTypes");
// tslint:disable-next-line no-require-imports
const domain = require('domain');
let isConsoleAlertsEnabled = true;
const consoleAlerts = {};
//noinspection JSUnusedGlobalSymbols
function disableConsoleAlerts() {
    isConsoleAlertsEnabled = false;
}
exports.disableConsoleAlerts = disableConsoleAlerts;
function enableConsoleAlerts() {
    isConsoleAlertsEnabled = true;
}
exports.enableConsoleAlerts = enableConsoleAlerts;
/**
 * Method to `console.error` to the console without tracking the error.
 *
 * @param args
 */
function consoleAlertError(...args) {
    if (isConsoleAlertsEnabled) {
        console.error(constants_1.DJATY_ALERTS_PREFIX, ...args);
    }
}
exports.consoleAlertError = consoleAlertError;
/**
 * Method to `console.log` to the console without tracking the log.
 *
 * @param args
 */
function consoleAlert(...args) {
    if (isConsoleAlertsEnabled) {
        console.log(constants_1.DJATY_ALERTS_PREFIX, ...args);
    }
}
exports.consoleAlert = consoleAlert;
/**
 * Method to `console.log` to the console only once without tracking the log.
 *
 * @param args
 */
function consoleAlertOnce(...args) {
    const hash = crypto.createHash('sha256').update(JSON.stringify(args), 'utf8').digest('hex');
    if (isConsoleAlertsEnabled && !(hash in consoleAlerts)) {
        consoleAlerts[hash] = true;
        console.log(constants_1.DJATY_ALERTS_PREFIX, ...args);
    }
}
exports.consoleAlertOnce = consoleAlertOnce;
class RequestError extends Error {
}
exports.RequestError = RequestError;
class DjatyError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
exports.DjatyError = DjatyError;
function parseError(err, maxFramesNo) {
    const name = err.name + '';
    let stack = '';
    let firstFrame = '';
    if (err.stack) {
        const frameList = err.stack.split('\n');
        stack = frameList
            .slice(0, maxFramesNo + 1)
            .filter(frameStr => !frameStr.match(/^ +at .*\/djaty-nodejs-agent\/dist\//))
            .join('\n');
        firstFrame = frameList[1];
    }
    const msg = name + ': ' + (err.message || '[no message]');
    const firstFrameStr = constants_1.AGENT_ID + constants_1.EXCEPTION_TRACKER_NAME + msg + firstFrame;
    const hash = crypto.createHash('sha256').update(firstFrameStr, 'utf8').digest('hex');
    return {
        itemType: timelineItemTypes_1.TimelineItemTypes.EXCEPTION,
        hash,
        msg,
        type: name,
        stringifiedStack: stack,
        timestamp: +new Date(),
    };
}
exports.parseError = parseError;
function getReqIP(req) {
    // client ip:
    //   node: req.connection.remoteAddress
    //   express, koa: req.ip
    let remoteAddr = (req.ip || req.connection && req.connection.remoteAddress);
    // `::1` This is the IPv6 `127.0.0.1` equivalent (Customer can config his machine to control
    // to enable or disable ipv6 for the his `localhost` hostname)
    remoteAddr = remoteAddr === '::1' ? '127.0.0.1' : remoteAddr;
    return remoteAddr;
}
exports.getReqIP = getReqIP;
function parseRequest(req) {
    // reqHeaders:
    //   node, express: req.headers
    //   koa: req.header
    const reqHeaders = req.headers || req.header || {};
    // method:
    //   node, express, koa: req.method
    const method = req.method;
    // host:
    //   express: req.hostname in > 4 and req.host in < 4
    //   koa: req.host
    //   node: req.headers.host
    //noinspection JSDeprecatedSymbols
    const host = req.hostname || req.host || reqHeaders.host || '[no host]';
    // protocol:
    //   node: <n/a>
    //   express, koa: req.protocol
    const isSocketEncrypted = req.socket && req.socket instanceof tls_1.TLSSocket && req.socket.encrypted;
    const protocol = req.protocol === 'https' || req.secure || isSocketEncrypted ? 'https' : 'http';
    // url (including path and query string):
    //   node, express: req.originalUrl
    //   koa: req.url
    let originalUrl = req.originalUrl || req.url;
    req.originalUrl = req.originalUrl && originalUrl;
    req.url = req.url && originalUrl;
    // query string:
    //   node: req.url (raw)
    //   express, koa: req.query
    const query = req.query || urlParser.parse(originalUrl || '', true).query;
    const djatyReqId = query.djatyReqId;
    originalUrl = removeUrlParameter(originalUrl, 'djatyReqId');
    if (req.query) {
        delete req.query.djatyReqId;
    }
    // absolute url
    const absoluteUrl = protocol + '://' + host + originalUrl;
    const queryParams = _.map(query, (value, name) => ({ name, value }));
    let remoteAddr = getReqIP(req);
    return {
        method,
        queryParams,
        djatyReqId,
        url: absoluteUrl,
        itemType: timelineItemTypes_1.TimelineItemTypes.HTTP_REQ,
        timestamp: +new Date(),
        remoteAddr,
    };
}
exports.parseRequest = parseRequest;
function removeUrlParameter(url, parameter) {
    const urlParts = url.split('?');
    if (urlParts.length >= 2) {
        // Get first part, and remove from array
        const urlBase = urlParts.shift();
        // Join it back up
        const queryString = urlParts.join('?');
        const prefix = encodeURIComponent(parameter) + '=';
        const parts = queryString.split(/[&;]/g);
        // Reverse iteration as may be destructive
        for (let i = parts.length; i-- > 0;) {
            // Idiom for string.startsWith
            if (parts[i].lastIndexOf(prefix, 0) !== -1) {
                parts.splice(i, 1);
            }
        }
        url = urlBase + '?' + parts.join('&');
    }
    return url;
}
exports.removeUrlParameter = removeUrlParameter;
/**
 * AsyncLoop loops over an array of functions. At the end of every function, user should call
 * next function which calls the next function in the functions array.
 *
 * Example:
 *
 * let f1 = (a, b, c, nextCb) => {
 *    console.info('f1', a, b, c);
 *    nextCb(++a, ++b, ++c);
 *  }
 * let f2 = (a, b, c, nextCb) => {
 *    console.info('f2', a, b, c);
 *    nextCb(++a, ++b, ++c);
 *  }
 *
 * asyncLoop([f1, f2], [1, 2, 3], window, (a, b, c) => {
 *   console.info('done', a, b, c)
 * })
 *
 * Output:
 * f1 1 2 3
 * f2 2 3 4
 * done 3 4 5
 *
 * @param {Array} funcArr
 * @param {Array} initArgs
 * @param {Object} ctx
 * @param {Function} doneCb: It will be called after calling all array functions.
 */
function asyncLoop(funcArr, initArgs, ctx, doneCb) {
    let i = 0;
    // Bind `doneCb()` to the active domain to prevent the side effect of the `djatyAsyncLoopDomain`
    // that may also leak its context to outer world if not `exit()`.
    // `!` as `asyncLoop()` is always being called within an active domain.
    const activeDomain = domain.active;
    const boundDoneCb = activeDomain.bind(doneCb);
    const djatyAsyncLoopDomain = domain.create();
    djatyAsyncLoopDomain.__name = 'djatyAsyncLoopDomain';
    function next(...args) {
        if (i === funcArr.length) {
            // Docs: "it's important to ensure that the current domain is exited."
            djatyAsyncLoopDomain.exit();
            boundDoneCb.apply(ctx, [undefined, ...args]);
            return;
        }
        funcArr[i++].apply(ctx, [...args, next]);
    }
    const djatyAsyncLoopDomainOnError = (err) => {
        // Docs: "it's important to ensure that the current domain is exited."
        djatyAsyncLoopDomain.exit();
        boundDoneCb.call(ctx, err);
    };
    djatyAsyncLoopDomain.on('error', djatyAsyncLoopDomainOnError);
    // `try/catch` is a workaround. As domains internally depend on a special
    // `uncaughtException` event to catch errors, they don't catch sync errors that are swallowed
    // and not cause this special `uncaughtException` event to be emitted.
    // Check this issue: https://github.com/nodejs/node/issues/22400
    // So, we must use `try/catch` every time we use `domain.run()` as it always prevents
    // the error from being swallowed.
    djatyAsyncLoopDomain.run(() => {
        try {
            next.apply(ctx, initArgs);
        }
        catch (err) {
            djatyAsyncLoopDomainOnError(err);
        }
    });
}
exports.asyncLoop = asyncLoop;
let showDjatyLogs = false;
function enableDjatyDebugging() {
    showDjatyLogs = true;
}
exports.enableDjatyDebugging = enableDjatyDebugging;
/**
 * Method to `console.log` to the console without tracking the log.
 *
 * @param args
 */
function djatyDebug(...args) {
    if (showDjatyLogs) {
        consoleAlert('[DEBUG]', ...args);
    }
}
exports.djatyDebug = djatyDebug;
/**
 * Error object stores the contextual data in inenumerable properties. So, when we send it to our
 * servers, it loses almost all the data. This function returns an object equivalent to the error
 * but can be sent normally.
 */
function getErrorObj(err) {
    return { message: err.message, stack: err.stack };
}
exports.getErrorObj = getErrorObj;
function formatConsoleItem(methodName, consoleParams) {
    const consoleEvent = {
        consoleParams,
        method: methodName,
        itemType: timelineItemTypes_1.TimelineItemTypes.CONSOLE,
        timestamp: +new Date(),
    };
    if (methodName === 'error') {
        const strMsg = JSON.stringify(consoleParams);
        const uniqueStr = constants_1.AGENT_ID + constants_1.CONSOLE_TRACKER_NAME + strMsg;
        consoleEvent.hash = crypto.createHash('sha256').update(uniqueStr, 'utf8').digest('hex');
    }
    return consoleEvent;
}
exports.formatConsoleItem = formatConsoleItem;
/**
 * This method should be used as a guard to prevent tracking errors inside a nested domain.
 * Nested domains can be user or Djaty created domains:
 * - User created domains 'll ruin the context as part of it 'll be saved at `djatyReqWrapDomain`
 *   and other part will be inside the user domain. So, we avoid creating a bug with this context.
 * - Djaty created domains like `djatyInternalErrorsDomain` and `djatyAsyncLoopDomain`
 *   will not include the request context. So, we avoid creating a bug with this context too.
 */
function isDjatyReqWrapDomain(activeDomain) {
    return activeDomain.__name === 'djatyReqWrapDomain';
}
exports.isDjatyReqWrapDomain = isDjatyReqWrapDomain;
//# sourceMappingURL=utils.js.map