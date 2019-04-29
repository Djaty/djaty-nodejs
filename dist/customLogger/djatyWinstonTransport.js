"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Transport = require("winston-transport");
const utils_1 = require("../utils");
// tslint:disable-next-line no-require-imports
const domain = require('domain');
/**
 * Defining a transport for winston instead of wrapping it's methods as wrapping will not work fine
 * with winston custom options.
 */
class DjatyWinstonTransport extends Transport {
    constructor(options) {
        super(options);
        this.levelMap = {};
        const mergedOptions = _.defaultsDeep(options, {
            // Transport core options
            name: 'djaty',
            silent: false,
            level: 'debug',
            // Custom options
            levelMap: {
                silly: 'debug',
                verbose: 'debug',
                info: 'info',
                debug: 'debug',
                warn: 'warn',
                error: 'error',
            },
        });
        this.levelMap = mergedOptions.levelMap;
        this.djaty = mergedOptions.djaty;
        this.name = mergedOptions.name;
        this.silent = mergedOptions.silent;
    }
    /**
     * log
     * @param info
     * @param callback  callback indicating success.
     */
    log(info, callback) {
        setImmediate(() => this.emit('logged', info));
        if (this.silent) {
            return callback(undefined, true);
        }
        const { level, message } = info;
        if (!(level in this.levelMap)) {
            return callback(undefined, true);
        }
        const mappedLevel = this.levelMap[level];
        const consoleItem = utils_1.formatConsoleItem(mappedLevel, [message]);
        this.djaty.trackTimelineItem(domain.active, consoleItem);
        return callback(undefined, true);
    }
}
exports.DjatyWinstonTransport = DjatyWinstonTransport;
//# sourceMappingURL=djatyWinstonTransport.js.map