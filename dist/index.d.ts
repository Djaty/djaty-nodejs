/// <reference types="node" />
/// <reference types="express" />
import { EventEmitter } from 'events';
import * as Express from 'express';
import * as utils from './utils';
import { CoreConfig } from './config/coreConfigs';
import { UserConfigOptions } from './interfaces/userConfigOptions';
import { AgentData } from './interfaces/agentData';
import { TimelineItemUnion } from './interfaces/timelineItemUnion';
import { MergedConfigOptions } from './interfaces/mergedConfigOptions';
import { ActiveDomain } from './interfaces/activeDomain';
import { TrackedUserBase } from './interfaces/trackedUserBase';
import { DjatyInterface } from './interfaces/djatyInterface';
export declare class Djaty extends EventEmitter implements DjatyInterface {
    private coreConfig;
    version: any;
    isInitiated: boolean;
    static DJATY_NOT_VALID_API_KEY: string;
    private static instance;
    private options;
    private maxTimelineItems;
    private maxStacktraceFramesNo;
    private globalCtx;
    private transport;
    private beforeSubmissionHandlerList;
    private customDataList;
    private isUncaughtExceptionCaught;
    private isDjatyCrashExceptionCaught;
    private djatyInternalErrorsDomain;
    private static USER_CONFIG_SCHEMA;
    private isRequestHandlerInstalled;
    private constructor();
    static getInstance(coreConfig: CoreConfig): Djaty;
    /**
     * @TODO assert server property in the following scenario (empty hostname, ...):
     *   {server: {publicKey: '', privateKey: '', hostname: '', path: ''}...
     * @param options
     * @returns {Djaty}
     */
    init(options?: UserConfigOptions): any;
    /**
     * Destroy agent
     * @returns {Djaty}
     */
    destroy(): any;
    /**
     * Express Request Handler middleware.
     *
     * @returns {(req:Express.Request, res:Express.Response, next:Function)=>undefined}
     */
    requestHandler(): (req: Express.Request, res: Express.Response, next: Function) => any;
    /**
     * Express Error Handler middleware.
     *
     * @returns {(err:DjatyError, req:Express.Request, res:(Express.Response), next:Function)=>any}
     */
    errorHandler(): (err: utils.RequestError, req: Express.Request, res: Express.Response, next: Function) => void;
    setUser({userId, logon}: TrackedUserBase): any;
    /**
     * Adding cb to beforeSubmissionHandlerList.
     */
    addBeforeSubmissionHandler(cb: (data: AgentData, next: (data: AgentData) => void) => void): any;
    /**
     * Adding cb to contextual beforeSubmissionContextHandlerList
     */
    addBeforeSubmissionContextHandler(cb: (data: AgentData, next: (data: AgentData) => void) => void): any;
    /**
     * Adding custom data to customDataList.
     */
    addGlobalCustomData(data: any): any;
    /**
     * Adding cb to beforeSubmissionHandlerList.
     */
    addContextCustomData(data: any): any;
    trackBug(bug: Error | string): Promise<{}>;
    getDjatyHostName(): string | undefined;
    trackTimelineItem(activeDomain: ActiveDomain | undefined, timelineItem: TimelineItemUnion): void;
    getOptions(): MergedConfigOptions;
    private processManualBug(bug, activeDomain, agentData);
    private handleSubmissionErr(err, activeDomain, cb);
    private getContext(activeDomain);
    /**
     * Use `this.trackConsoleError` and not `console.log` as `console.log` internally will add
     * the timeline item to the active domain which is `this.djatyInternalErrorsDomain`
     * and not the current domain of the request (Which the `req` and `res` objects are added to).
     *
     * @param activeDomain
     * @param {[]} consoleParams
     */
    private trackConsoleError(activeDomain, consoleParams);
    private onAfterErrorHandled();
    /**
     * Use `this.trackStringErrorTimelineItem` and not `console.error` as `console.error` internally
     * will add the timeline item to the active domain which is `this.djatyInternalErrorsDomain`
     * and not the current domain of the request (Which the `req` and `res` objects are added to).
     *
     * @param {ActiveDomain} activeDomain
     * @param {[]} consoleParams
     * @return {ContextArgs}
     */
    private trackStringErrorTimelineItem(activeDomain, consoleParams);
    private onDjatyDomainError(err);
    private process(activeDomain, agentData, cb);
    private prepareSubmissionPayload(activeDomain, ctxArgs);
    private submitDjatyCrashReport(djatyErr, cb);
    private initTrackingOptions(trackingOpts);
    private registerExceptionHandler();
    /**
     * The 'unhandledRejection' event is emitted whenever a Promise is rejected and no error handler
     * is attached to the promise within a turn of the event loop.
     */
    private registerRejectionHandler();
    private setContext(activeDomain, ctx);
    private resetCtxTimeline(activeDomain);
    /**
     * captureError
     *
     * @param err: `any` as the err can result from `throw 'text or anything else'`
     * @param errType
     */
    private captureError(err, errType?);
    private sendUserFilterError(activeDomain, ctxArgs, filterErr, cb);
    private trackExceptionItem(err, activeDomain);
    private wrap(func);
    private getUserFromReq(activeDomain, parseUser);
    private isTrackedUserValidObj(activeDomain, user);
    /**
     * Prevent Djaty crashes - if any - from blocking user logic. It also submits the crash report.
     *
     * If `wrapWithTryCatch` is used inside a `process.domain.run`, it's a workaround. As domains
     * internally depend on a special `uncaughtException` event to catch errors, they don't catch sync
     * errors that are swallowed and not cause this special `uncaughtException` event to be emitted.
     * Check this issue: https://github.com/nodejs/node/issues/22400
     * So, we must use `try/catch` every time we use `domain.run()` as it always prevents
     * the error from being swallowed.
     */
    private wrapWithTryCatch(cb);
    /**
     * Exiting stacked Domains to avoid leaking the context between server requests.
     * Ref: https://github.com/nodejs/node/issues/26081
     * @TODO, find better solution
     */
    private exitStackedDomains();
}
export declare const djaty: DjatyInterface;
export { UserConfigOptions } from './interfaces/userConfigOptions';
export { AllowedCustomLoggers } from './customLogger/allowedCustomLoggers';
export { DefaultStages } from './config/validationDefaults';
export { SubmissionAcknowledge } from './consts/submissionAcknowledge';
