/// <reference types="express" />
/// <reference types="koa" />
import * as Express from 'express';
import * as Koa from 'koa';
import { ExceptionTimelineItem } from './interfaces/exceptionTimelineItem';
import { HttpTimelineItem } from './interfaces/httpTimelineItem';
import { ActiveDomain } from './interfaces/activeDomain';
import { ConsoleTimelineItem } from './interfaces/consoleTimelineItem';
export declare function disableConsoleAlerts(): void;
export declare function enableConsoleAlerts(): void;
/**
 * Method to `console.error` to the console without tracking the error.
 *
 * @param args
 */
export declare function consoleAlertError(...args: any[]): void;
/**
 * Method to `console.log` to the console without tracking the log.
 *
 * @param args
 */
export declare function consoleAlert(...args: any[]): void;
/**
 * Method to `console.log` to the console only once without tracking the log.
 *
 * @param args
 */
export declare function consoleAlertOnce(...args: any[]): void;
export declare class RequestError extends Error {
    resBody?: {
        [p: string]: any;
    };
    statusCode?: number | undefined;
    status?: number;
    status_code?: string;
    reasons?: {
        keyword: string;
    }[];
    reqBody: any;
    code?: string;
}
export declare enum ProcessAcknowledge {
    USER_FILTER_ERROR = 0,
    DJATY_CRASH_REPORT_SENT = 1,
    BUG_REPORTED = 2,
    FRONTEND_LINKING_TEMP_BUG_REPORTED = 3,
    DJATY_CRASH_REPORT_DISABLED = 4,
}
export declare class DjatyError extends Error {
    code?: string;
    constructor(message: string, code?: DjatyErrorCodes);
}
export declare enum DjatyErrorCodes {
    NOT_INITIATED = "NOT_INITIATED",
    NO_DJATY_REQ_ID_FOR_TEMP_BUG = "NO_DJATY_REQ_ID_FOR_TEMP_BUG",
}
export declare function parseError(err: Error, maxFramesNo: number): ExceptionTimelineItem;
export declare function getReqIP(req: (Express.Request | Koa.Request) & {
    connection?: {
        remoteAddress?: string;
    };
}): string;
export declare function parseRequest(req: (Express.Request | Koa.Request) & {
    body: any;
}): HttpTimelineItem;
export declare function removeUrlParameter(url: string, parameter: string): string;
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
export declare function asyncLoop(funcArr: ((...args: any[]) => void)[], initArgs: any[], ctx: object, doneCb: (...args: any[]) => void): void;
export declare function enableDjatyDebugging(): void;
/**
 * Method to `console.log` to the console without tracking the log.
 *
 * @param args
 */
export declare function djatyDebug(...args: any[]): void;
/**
 * Error object stores the contextual data in inenumerable properties. So, when we send it to our
 * servers, it loses almost all the data. This function returns an object equivalent to the error
 * but can be sent normally.
 */
export declare function getErrorObj(err: Error): {
    message: string;
    stack: string | undefined;
};
export declare function formatConsoleItem(methodName: string, consoleParams: any[]): ConsoleTimelineItem;
/**
 * This method should be used as a guard to prevent tracking errors inside a nested domain.
 * Nested domains can be user or Djaty created domains:
 * - User created domains will ruin the context as part of it will be saved inside `reqWrapDomain`
 *   and other part will be inside the user domain. So, we avoid creating a bug with this context.
 * - Djaty created domains like `djatyErrorsDomain` and `asyncLoopDomain` will not include
 *   the request context. So, we avoid creating a bug with this context too.
 */
export declare function isReqWrapDomain(activeDomain: ActiveDomain): boolean;
