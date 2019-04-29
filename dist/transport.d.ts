/// <reference types="node" />
import * as events from 'events';
import * as utils from './utils';
import { SendOptions } from './interfaces/sendOptions';
import { TransportSendOptions } from './interfaces/transportSendOptions';
export declare class HTTPTransport extends events.EventEmitter {
    private options;
    static DJATY_NOT_SUPPORTED_REDIRECTION: string;
    private transport;
    private readonly reqOptions;
    constructor(options: SendOptions);
    send({data, isReport}: TransportSendOptions, cb: (err?: utils.RequestError) => void): void;
    private static getProxyReqOptions(headers, proxy);
    /**
     * Find header and return its value (Case insensitive)
     * @param {string} targetHeader
     * @param headerMap
     * @returns {string}
     */
    private static findHeaderVal(targetHeader, headerMap);
    private static isServerErr(err);
    private getReqOptions(isCrashReport?);
}
