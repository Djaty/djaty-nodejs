import * as _ from 'lodash';
import * as Transport from 'winston-transport';

import {DjatyDomain} from '../interfaces/djatyDomain';
import {formatConsoleItem} from '../utils';
import {DjatyInterface} from '../interfaces/djatyInterface';

// tslint:disable-next-line no-require-imports
const domain = <DjatyDomain> require('domain');

export type DjatyWinstonTransportOptions =
  Transport.TransportStreamOptions & {djaty: DjatyInterface};

/**
 * Defining a transport for winston instead of wrapping it's methods as wrapping will not work fine
 * with winston custom options.
 */
export class DjatyWinstonTransport extends Transport {
  silent: boolean;

  private name: boolean;
  private readonly levelMap: {[p: string]: string} = {};
  private djaty: DjatyInterface;

  constructor(options: DjatyWinstonTransportOptions) {
    super(options);

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
  log(info: {level: string, message: string}, callback: Function) {
    setImmediate(() => this.emit('logged', info));

    if (this.silent) {
      return callback(undefined, true);
    }

    const {level, message} = info;

    if (!(level in this.levelMap)) {
      return callback(undefined, true);
    }

    const mappedLevel = this.levelMap[level];

    const consoleItem = formatConsoleItem(mappedLevel, [message]);
    this.djaty.trackTimelineItem(domain.active, consoleItem);

    return callback(undefined, true);
  }
}
