import * as Transport from 'winston-transport';
import { DjatyInterface } from '../interfaces/djatyInterface';
export declare type DjatyWinstonTransportOptions = Transport.TransportStreamOptions & {
    djaty: DjatyInterface;
};
/**
 * Defining a transport for winston instead of wrapping it's methods as wrapping will not work fine
 * with winston custom options.
 */
export declare class DjatyWinstonTransport extends Transport {
    silent: boolean;
    private name;
    private levelMap;
    private djaty;
    constructor(options: DjatyWinstonTransportOptions);
    /**
     * log
     * @param info
     * @param callback  callback indicating success.
     */
    log(info: {
        level: string;
        message: string;
    }, callback: Function): any;
}
