"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const winston = require("winston");
const debug = require("debug");
const _ = require("lodash");
const constants_1 = require("./consts/constants");
const timelineItemTypes_1 = require("./interfaces/timelineItemTypes");
const utils = require("./utils");
const djatyWinstonTransport_1 = require("./customLogger/djatyWinstonTransport");
// tslint:disable-next-line no-require-imports
const domain = require('domain');
/**
 * Polyfill a method
 *
 * @param obj: Object e.g. `document`
 * @param name: Method name present on object e.g. `addEventListener`
 * @param replacement: Replacement function
 * @param track: Optional, record instrumentation to an array
 */
function fill(obj, name, replacement, track) {
    const orig = obj[name];
    obj[name] = replacement(orig);
    if (track instanceof Array) {
        track.push({ obj, name, orig });
    }
}
exports.fill = fill;
exports.allowedConsoleMethods = ['debug', 'info', 'warn', 'error', 'log'];
/**
 * Array of original functions
 * @type {Array}
 */
exports.originals = [];
// noinspection JSUnusedLocalSymbols
const customLoggers = {
    winston(djaty, options) {
        const restOpts = _.omit(options, ['name']);
        fill(winston, 'createLogger', (origCreateLogger) => (opts) => {
            return origCreateLogger
                .call(winston, opts)
                .add(new djatyWinstonTransport_1.DjatyWinstonTransport(Object.assign({ silent: false, level: 'debug', djaty }, restOpts)));
        }, exports.originals);
    },
    debug(djaty, options) {
        if (debug.enabled) {
            // @TODO
        }
    },
};
const wrappers = {
    stdLogs(djaty) {
        fill(process.stdout, 'write', (originalStdMethod) => (...stdParams) => {
            const param = stdParams[0];
            if (util.isString(param) && param.match(new RegExp(`^${constants_1.DJATY_ALERTS_PREFIX}`))) {
                return originalStdMethod.apply(process.stdout, stdParams);
            }
            originalStdMethod.apply(process.stdout, stdParams);
            const consoleItem = utils.formatConsoleItem('log', stdParams);
            djaty.trackTimelineItem(domain.active, consoleItem);
        }, exports.originals);
        fill(process.stderr, 'write', (originalStdMethod) => (...stdParams) => {
            const param = stdParams[0];
            if (util.isString(param) && param.match(new RegExp(`^${constants_1.DJATY_ALERTS_PREFIX}`))) {
                return originalStdMethod.apply(process.stdout, stdParams);
            }
            originalStdMethod.apply(process.stderr, stdParams);
            const consoleItem = utils.formatConsoleItem('error', stdParams);
            djaty.trackTimelineItem(domain.active, consoleItem);
        }, exports.originals);
    },
    console(djaty) {
        function wrapConsoleMethod(methodName) {
            if (!(methodName in console)) {
                return;
            }
            fill(console, methodName, (originalConsoleMethod) => (...consoleParams) => {
                const param = consoleParams[0];
                if (util.isString(param) && param.match(new RegExp(constants_1.DJATY_ALERTS_PREFIX))) {
                    return originalConsoleMethod.apply(console, consoleParams);
                }
                originalConsoleMethod.apply(console, consoleParams);
                const consoleItem = utils.formatConsoleItem(methodName, consoleParams);
                djaty.trackTimelineItem(domain.active, consoleItem);
            }, exports.originals);
        }
        exports.allowedConsoleMethods.forEach(wrapConsoleMethod);
    },
    http(djaty) {
        // Require on the need
        // tslint:disable-next-line no-require-imports
        const http = require('http');
        const OrigClientRequest = http.ClientRequest;
        const ClientRequest = function (options, cb) {
            // @TODO: We need to capture a timeline item if a response never comes.
            OrigClientRequest.call(this, options, cb);
            // We could just always reconstruct this from this.agent, this.path, etc
            // but certain other http-instrumenting libraries (like nock, which we use for tests) fail to
            // maintain the guarantee that after calling OrigClientRequest, those fields will be populated
            if (typeof options === 'string') {
                // noinspection JSUnusedGlobalSymbols
                this.__djatyReqItemUrl = options;
            }
            else {
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
        fill(ClientRequest.prototype, 'emit', (origEmit) => {
            return function (evt, maybeResp) {
                if (evt === 'response' && this.__djatyReqItemUrl) {
                    // Don't capture timeline requests for ours
                    if (!djaty.isInitiated ||
                        this.__djatyReqItemUrl.indexOf(djaty.getDjatyHostName()) === -1) {
                        djaty.trackTimelineItem(domain.active, {
                            itemType: timelineItemTypes_1.TimelineItemTypes.HTTP_REQ,
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
        }, exports.originals);
        // http.request orig refs module-internal ClientRequest, not exported one, so
        // it still points at orig ClientRequest after our monkey-patch; these re-impls
        // just get that reference updated to use our new ClientRequest
        fill(http, 'request', function () {
            return (options, cb) => {
                return new http.ClientRequest(options, cb);
            };
        }, exports.originals);
        fill(http, 'get', () => {
            return (options, cb) => {
                const req = http.request(options, cb);
                req.end();
                return req;
            };
        }, exports.originals);
    },
    customLoggers(djaty, customLoggerOptions) {
        customLoggerOptions.forEach(loggerConfig => {
            const loggerName = loggerConfig.name;
            const loggerWrapper = customLoggers[loggerName];
            if (!loggerWrapper) {
                throw new utils.DjatyError(`Associated logger ${loggerName} is not available!`);
            }
            loggerWrapper(djaty, loggerConfig);
        });
    },
};
function instrument({ key, wrapperOpts }, djaty) {
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
exports.instrument = instrument;
function restoreOriginals() {
    let original;
    // tslint:disable-next-line no-conditional-assignment
    while (original = exports.originals.shift()) {
        const { obj, name, orig } = original;
        obj[name] = orig;
    }
}
exports.restoreOriginals = restoreOriginals;
//# sourceMappingURL=trackingWrappers.js.map