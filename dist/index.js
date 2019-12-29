"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Use patches. they must Run at the start.
const domainPromiseWrapper_1 = require("./wrappers/domainPromiseWrapper");
global.Promise = domainPromiseWrapper_1.PatchedPromise;
const events_1 = require("events");
const _ = require("lodash");
const Ajv = require("ajv");
const utils = require("./utils");
const trackingWrappers = require("./trackingWrappers");
const coreConfigs_1 = require("./config/coreConfigs");
const transport_1 = require("./transport");
const constants_1 = require("./consts/constants");
const logMessages_1 = require("./consts/logMessages");
const userConfigValidation_1 = require("./userConfigValidation");
const timelineItemTypes_1 = require("./interfaces/timelineItemTypes");
// tslint:disable-next-line no-require-imports
const serverLocalIp = require('ip').address();
// tslint:disable-next-line no-require-imports
const computerName = require('computer-name');
// tslint:disable-next-line no-require-imports
const domain = require('domain');
const ajv = new Ajv({ allErrors: true, jsonPointers: true });
// tslint:disable-next-line no-require-imports
require('ajv-keywords')(ajv, 'instanceof');
// tslint:disable-next-line no-require-imports
require('ajv-errors')(ajv);
class Djaty extends events_1.EventEmitter {
    // noinspection JSUnusedLocalSymbols
    constructor(coreConfig) {
        super();
        this.coreConfig = coreConfig;
        //noinspection JSUnusedGlobalSymbols
        this.version = constants_1.DJATY_VERSION;
        this.isInitiated = false;
        this.globalCtx = {};
        this.beforeSubmissionHandlerList = [];
        this.customDataList = [];
        // To control tracking unhandled exception. Global-scoped flag and will be accessible across all
        // the HTTP requests. It prevents tracking more exception and it doesn't matter if it's global as
        // the process should be exited.
        this.isUncaughtExceptionCaught = false;
        // To control tracking djaty crash exceptions. Global-scoped flag and will be accessible across
        // all the HTTP requests and it doesn't matter if it's global as the process should be exited.
        this.isDjatyCrashExceptionCaught = false;
        // Domain to track our internal djaty unhandled exceptions. Global-scoped domain and it will be
        // accessible across all the HTTP requests. On errors, it will exit the process.
        // @TODO, we need to make this domain local to the request to enable us storing
        // a req-scoped timeline and submit a request to our tracking projects.
        this.djatyInternalErrorsDomain = domain.create();
        this.isRequestHandlerInstalled = false;
        this.djatyInternalErrorsDomain.__name = 'djatyInternalErrorsDomain';
        ajv.addSchema(userConfigValidation_1.userConfigSchema, Djaty.USER_CONFIG_SCHEMA);
    }
    static getInstance(coreConfig) {
        if (!Djaty.instance) {
            Djaty.instance = new Djaty(coreConfig);
        }
        return Djaty.instance;
    }
    //noinspection JSUnusedGlobalSymbols
    /**
     * @TODO assert server property in the following scenario (empty hostname, ...):
     *   {server: {publicKey: '', privateKey: '', hostname: '', path: ''}...
     * @param options
     * @returns {Djaty}
     */
    init(options) {
        return this.wrapWithTryCatch(() => {
            if (this.isInitiated) {
                return this;
            }
            // We get lots of users using djaty-nodejs when they want djaty-javascript, hence this warning
            // if it seems like a browser.
            if (typeof window !== 'undefined' && typeof document !== 'undefined' &&
                typeof navigator !== 'undefined') {
                utils.consoleAlertOnce('This looks like a browser environment; are you sure you don\'t' +
                    ' want djaty-javascript for browser? https://djaty.com/');
                return this;
            }
            const userOptions = _.defaults({}, options || {}, {
                apiKey: process.env.DJATY_API_KEY,
                apiSecret: process.env.DJATY_API_SECRET,
                release: process.env.DJATY_RELEASE,
            });
            if (userOptions.showDjatyLogs) {
                utils.enableDjatyDebugging();
            }
            const isOptionsValid = ajv.validate(Djaty.USER_CONFIG_SCHEMA, userOptions);
            if (!isOptionsValid) {
                throw new utils.DjatyError('Options are not valid. Bug tracking disabled! ' +
                    `Errors: ${ajv.errorsText()}`);
            }
            this.options = _.defaultsDeep({}, userOptions, {
                djatyIsTracking: this.coreConfig.djatyIsTracking,
                allowAutoSubmission: this.coreConfig.allowAutoSubmission,
                showDjatyLogs: false,
                reportDjatyCrashes: true,
                tags: [],
                exitOnUncaughtExceptions: true,
                submissionTimeout: this.coreConfig.submissionTimeout,
                server: {
                    hostname: this.coreConfig.hostname,
                    apiPath: this.coreConfig.apiPath,
                    secure: true,
                },
                trackingOptions: {
                    captureUnhandledRejections: true,
                    timelineLimit: this.coreConfig.timelineDefaultMaxLimit,
                    stacktraceLimit: this.coreConfig.stacktraceDefaultMaxLimit,
                    allowedWrappers: this.coreConfig.allowedWrappers,
                    parseUser: this.coreConfig.parseUser,
                },
            });
            if (!this.options.djatyIsTracking) {
                utils.consoleAlertError('`options.djatyIsTracking` is `false`. Bug tracking disabled!');
            }
            if (process.env.DJATY_IS_TRACKING === 'false') {
                utils
                    .consoleAlertError('`process.env.DJATY_IS_TRACKING` is `false`. Bug tracking disabled!');
                this.options.djatyIsTracking = false;
            }
            if (!this.options.apiKey || !this.options.apiSecret) {
                throw new utils.DjatyError('Project keys are missing. Bug tracking disabled!');
            }
            this.isInitiated = true;
            if (!this.options.djatyIsTracking) {
                return this;
            }
            this.globalCtx.tags = this.options.tags;
            this.globalCtx.stage = this.options.stage;
            this.transport = new transport_1.HTTPTransport({
                server: this.options.server,
                proxy: this.options.proxy ? Object.assign({ secure: true }, this.options.proxy) : undefined,
            });
            this.initTrackingOptions(this.options.trackingOptions);
            // `disableDjatyDomainErrors`: is used for tests so don't expose in the options interface.
            if (!userOptions.disableDjatyDomainErrors) {
                this.djatyInternalErrorsDomain.on('error', this.onDjatyDomainError.bind(this));
            }
            if (this.options.onBeforeBugSubmission) {
                this.addBeforeSubmissionHandler(this.options.onBeforeBugSubmission);
            }
            this.registerExceptionHandler();
            if (this.options.trackingOptions.captureUnhandledRejections) {
                this.registerRejectionHandler();
            }
            return this;
        });
    }
    //noinspection JSUnusedGlobalSymbols
    /**
     * Destroy agent
     * @returns {Djaty}
     */
    destroy() {
        return this.wrapWithTryCatch(() => {
            if (!this.isInitiated) {
                return this;
            }
            this.isInitiated = false;
            this.beforeSubmissionHandlerList = [];
            this.customDataList = [];
            this.isUncaughtExceptionCaught = false;
            this.isDjatyCrashExceptionCaught = false;
            this.isRequestHandlerInstalled = false;
            this.setContext(domain.active, {});
            trackingWrappers.restoreOriginals();
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('unhandledRejection');
            this.djatyInternalErrorsDomain.removeAllListeners('error');
            return this;
        });
    }
    //noinspection JSUnusedGlobalSymbols,JSValidateJSDoc
    /**
     * Express Request Handler middleware.
     *
     * @returns {(req:Express.Request, res:Express.Response, next:Function)=>undefined}
     */
    requestHandler() {
        if (!this.isInitiated) {
            throw new utils.DjatyError(`requestHandler(): Djaty is not initiated.`);
        }
        this.isRequestHandlerInstalled = true;
        return (req, res, next) => {
            if (!this.options.djatyIsTracking) {
                // We must return the `next()` to support Koa
                return next();
            }
            // If user server is receiving further requests during tracking another previous uncaught
            // exception. To minimize entering this condition we need to handle the previous exception
            // very quickly and also to set the `timeout` duration to a minimum value as possible.
            if (this.options.exitOnUncaughtExceptions && this.isUncaughtExceptionCaught) {
                // 502 so nginx, ELB, etc will try the request again with another working server.
                res.sendStatus(502);
                return;
            }
            return this.wrap(() => {
                this.wrapWithTryCatch(() => {
                    // `!`: The domain here is active as it's created inside the `wrap()`.
                    const activeDomain = domain.active;
                    activeDomain.add(req);
                    activeDomain.add(res);
                    const receivedReq = utils.parseRequest(req);
                    const currCtx = this.getContext(activeDomain);
                    currCtx.djatyReqId = receivedReq.djatyReqId;
                    this.setContext(activeDomain, currCtx);
                    this.trackTimelineItem(activeDomain, receivedReq);
                });
                // We must return the `next()` to support Koa
                return next();
            });
        };
    }
    //noinspection JSUnusedGlobalSymbols,JSValidateJSDoc
    /**
     * Express Error Handler middleware.
     *
     * @returns {(err:DjatyError, req:Express.Request, res:(Express.Response), next:Function)=>any}
     */
    errorHandler() {
        if (!this.isInitiated) {
            throw new utils.DjatyError(`errorHandler(): Djaty is not initiated.`);
        }
        if (!this.isRequestHandlerInstalled) {
            throw new utils.DjatyError(`Ensure Djaty.requestHandler is installed.`);
        }
        return (err, req, res, next) => {
            // Don't pass and call `next` to handle Koa as it doesn't handle errors by `next(err)`.
            if (next) {
                next(err);
            }
            const status = err.status || err.statusCode || Number(err.status_code) || 500;
            // Handle Koa: We should set the status code of the response to handle the request properly.
            if (!res.headersSent)
                res.statusCode = status;
            if (!this.options.djatyIsTracking) {
                return;
            }
            // skip anything not marked as an internal server error
            if (status < 500) {
                this.exitStackedDomains();
                return;
            }
            this.captureError(err);
        };
    }
    //noinspection JSUnusedGlobalSymbols,JSValidateJSDoc
    setUser({ userId, logon }) {
        return this.wrapWithTryCatch(() => {
            if (!this.isInitiated) {
                this.trackConsoleError(domain.active, ['setUser(): Initiate Djaty first.']);
                return this;
            }
            if (!this.options.djatyIsTracking) {
                return this;
            }
            const trackedUser = { userId, logon };
            if (!this.isTrackedUserValidObj(domain.active, trackedUser)) {
                return this;
            }
            const currCtx = this.getContext(domain.active);
            currCtx.user = trackedUser;
            this.setContext(domain.active, currCtx);
            return this;
        });
    }
    /**
     * Adding cb to beforeSubmissionHandlerList.
     */
    addBeforeSubmissionHandler(cb) {
        return this.wrapWithTryCatch(() => {
            if (!this.isInitiated) {
                this.trackConsoleError(domain.active, ['addBeforeSubmissionHandler(): Initiate ' +
                        'Djaty first.']);
                return this;
            }
            if (!this.options.djatyIsTracking) {
                return this;
            }
            if (typeof cb !== 'function') {
                this.trackConsoleError(domain.active, ['addBeforeSubmissionHandler(): Ensure "cb" ' +
                        'parameter is a function']);
                return this;
            }
            this.beforeSubmissionHandlerList.push(cb);
            return this;
        });
    }
    //noinspection JSUnusedGlobalSymbols
    /**
     * Adding cb to contextual beforeSubmissionContextHandlerList
     */
    addBeforeSubmissionContextHandler(cb) {
        return this.wrapWithTryCatch(() => {
            if (!this.isInitiated) {
                this.trackConsoleError(domain.active, ['addBeforeSubmissionContextHandler(): ' +
                        'Initiate Djaty first']);
                return this;
            }
            if (!this.options.djatyIsTracking) {
                return this;
            }
            if (typeof cb !== 'function') {
                this.trackConsoleError(domain.active, ['addBeforeSubmissionContextHandler(): ' +
                        'Ensure "cb" parameter is a function']);
                return this;
            }
            const currCtx = this.getContext(domain.active);
            if (!currCtx.beforeSubmissionContextHandlerList) {
                currCtx.beforeSubmissionContextHandlerList = [];
            }
            currCtx.beforeSubmissionContextHandlerList.push(cb);
            this.setContext(domain.active, currCtx);
            return this;
        });
    }
    //noinspection JSUnusedGlobalSymbols
    /**
     * Adding custom data to customDataList.
     */
    addGlobalCustomData(data) {
        return this.wrapWithTryCatch(() => {
            if (!this.isInitiated) {
                this.trackConsoleError(domain.active, ['addGlobalCustomData(): Initiate Djaty first.']);
                return this;
            }
            if (!this.options.djatyIsTracking) {
                return this;
            }
            this.customDataList.push(data);
            return this;
        });
    }
    //noinspection JSUnusedGlobalSymbols
    /**
     * Adding cb to beforeSubmissionHandlerList.
     */
    addContextCustomData(data) {
        return this.wrapWithTryCatch(() => {
            if (!this.isInitiated) {
                this.trackConsoleError(domain.active, ['addContextCustomData(): Initiate Djaty first']);
                return this;
            }
            if (!this.options.djatyIsTracking) {
                return this;
            }
            const currCtx = this.getContext(domain.active);
            if (!currCtx.customDataContextList) {
                currCtx.customDataContextList = [];
            }
            currCtx.customDataContextList.push(data);
            this.setContext(domain.active, currCtx);
            return this;
        });
    }
    //noinspection JSUnusedGlobalSymbols
    trackBug(bug) {
        // Catching the request domain context before using the `djatyInternalErrorsDomain`.
        const activeDomain = domain.active;
        return new Promise((resolve, reject) => {
            this.djatyInternalErrorsDomain.run(() => {
                return this.wrapWithTryCatch(() => {
                    if (!this.isInitiated) {
                        reject(new utils.DjatyError(`trackBug(): Initiate Djaty first.`, utils.DjatyErrorCodes.NOT_INITIATED));
                        return;
                    }
                    if (!this.options.djatyIsTracking) {
                        return;
                    }
                    if (activeDomain && !utils.isDjatyReqWrapDomain(activeDomain)) {
                        // A guard to prevent tracking errors inside a nested user domain.
                        utils.consoleAlertError('Nested Domain! Tracking disabled for current request.');
                        return;
                    }
                    const currCtx = this.getContext(activeDomain);
                    if (!this.options.allowAutoSubmission && !currCtx.djatyReqId) {
                        reject(new utils.DjatyError('trackBug(): `options.allowAutoSubmission` is disabled.', utils.DjatyErrorCodes.NO_DJATY_REQ_ID_FOR_TEMP_BUG));
                        return;
                    }
                    // noinspection SuspiciousTypeOfGuard
                    if (!(bug instanceof Error) && typeof bug !== 'string') {
                        reject(new utils.DjatyError('trackBug(): Input should only be a String or an Error.'));
                        return;
                    }
                    if (bug instanceof Error) {
                        const exception = this.trackExceptionItem(bug, activeDomain);
                        const shortTitle = exception.msg.substr(0, 255);
                        const errCtxArgs = {
                            hash: exception.hash,
                            shortTitle,
                            longTitle: shortTitle,
                        };
                        const errAgentData = this.prepareSubmissionPayload(activeDomain, errCtxArgs);
                        this.processManualBug(bug.message, activeDomain, errAgentData)
                            .then(resolve).catch(reject);
                        return;
                    }
                    const strErrCtxArgs = this.trackStringErrorTimelineItem(activeDomain, [bug]);
                    const strErrAgentData = this.prepareSubmissionPayload(activeDomain, strErrCtxArgs);
                    this.processManualBug(bug, activeDomain, strErrAgentData).then(resolve).catch(reject);
                });
            });
        });
    }
    getDjatyHostName() {
        // Avoid capturing tracked items before instrumentation finishes.
        if (!this.isInitiated) {
            return;
        }
        return this.options.server.hostname;
    }
    trackTimelineItem(activeDomain, timelineItem) {
        // Avoid capturing tracked items before initialization finishes.
        if (!this.isInitiated) {
            return;
        }
        timelineItem.timestamp = +new Date();
        const currCtx = this.getContext(activeDomain);
        if (!currCtx.timeline) {
            currCtx.timeline = [];
        }
        currCtx.timeline.push(timelineItem);
        if (currCtx.isTimelineTrimmed) {
            currCtx.timeline.shift();
            this.setContext(activeDomain, currCtx);
            return;
        }
        // (-1) to leave one place for the trimmed Item when merged with other items on submission.
        if (currCtx.timeline.length > this.maxTimelineItems - 1) {
            // On limiting timeline, keep the first item and trim starting from the next items (If the
            // domain is active as this indicates a request and the first item will be an httpReq item
            // that we should keep. But if the active domain is undefined or not `djatyReqWrapDomain`,
            // the first timeline item could be anything else.
            const httpReqItem = activeDomain && activeDomain.__name === 'djatyReqWrapDomain' ?
                currCtx.timeline.shift() : undefined;
            const trimmingItem = { timestamp: +new Date(), itemType: timelineItemTypes_1.TimelineItemTypes.TRIMMING };
            currCtx.trimmedItems = httpReqItem ? [httpReqItem, trimmingItem] : [trimmingItem];
            currCtx.isTimelineTrimmed = true;
            // Shift to leave a place for the trimming item.
            currCtx.timeline.shift();
        }
        this.setContext(activeDomain, currCtx);
    }
    getOptions() {
        return this.options;
    }
    processManualBug(bug, activeDomain, agentData) {
        return new Promise((resolve, reject) => {
            return this.wrapWithTryCatch(() => {
                this.process(activeDomain, agentData, (processErr, ack) => {
                    if (!this.options.allowAutoSubmission) {
                        resolve(utils.ProcessAcknowledge.FRONTEND_LINKING_TEMP_BUG_REPORTED);
                        return;
                    }
                    // Submission failed
                    if (processErr) {
                        if (processErr instanceof utils.DjatyError) {
                            // Cannot submit for a known reason.
                            reject(processErr);
                            return;
                        }
                        // Cannot submit for an unknown reason, just log it.
                        utils.consoleAlertError('Unknown submission error:', processErr, 'Bug:', bug);
                        reject(processErr);
                        return;
                    }
                    // Submission done successfully
                    if (ack === utils.ProcessAcknowledge.USER_FILTER_ERROR) {
                        utils.consoleAlert('Djaty.onBeforeSubmission() is not configured properly. ' +
                            'A detailed bug reported.');
                        resolve(utils.ProcessAcknowledge.USER_FILTER_ERROR);
                        return;
                    }
                    if (ack === utils.ProcessAcknowledge.DJATY_CRASH_REPORT_SENT) {
                        utils.consoleAlert('Djaty crash report submitted successfully.');
                        resolve(utils.ProcessAcknowledge.DJATY_CRASH_REPORT_SENT);
                        return;
                    }
                    if (ack === utils.ProcessAcknowledge.DJATY_CRASH_REPORT_DISABLED) {
                        utils.consoleAlert('Djaty has encountered a problem and the crash report cannot be' +
                            ' sent. For a better experience and to help us fix those kinds of problems in the' +
                            ' future, please enable \'reportDjatyCrashes\' option.');
                        resolve(utils.ProcessAcknowledge.DJATY_CRASH_REPORT_DISABLED);
                        return;
                    }
                    utils.consoleAlert('Bug reported:', bug);
                    resolve(utils.ProcessAcknowledge.BUG_REPORTED);
                });
            });
        });
    }
    handleSubmissionErr(err, activeDomain, cb) {
        const errMsg = 'Bug cannot be submitted';
        let { code, statusCode } = err;
        utils.djatyDebug('Djaty.handleSubmissionErr()', errMsg, 'code', code, 'statusCode', statusCode, 'err:', err);
        if (!code && err.reasons && err.reasons[0] && err.reasons[0].keyword) {
            code = err.reasons[0].keyword;
        }
        // Errors that we cannot submit any more
        const ServerErrNoRetryMap = {
            [Djaty.DJATY_NOT_VALID_API_KEY]: '`apiKey` or `apiSecret` is invalid',
            [transport_1.HTTPTransport.DJATY_NOT_SUPPORTED_REDIRECTION]: 'Redirection is not supported!',
            EPROTO: 'Please make sure that the connection to the proxy and Djaty servers are both the ' +
                'same, secured or not. Mixed state will never work!',
            UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Current connection to Djaty is secured ' +
                'with a self-signed certificate but the current config has not passed the `server` object ' +
                'with a `ca` (Certification Authority) property!',
            CERT_HAS_EXPIRED: 'The certificate  of the HTTPS connection to djaty has been expired!',
            ECONNREFUSED: 'Make sure `server` config is correct.',
            ENOTFOUND: 'Make sure `server` config is correct.',
        };
        if (ServerErrNoRetryMap[code]) {
            cb(new utils.DjatyError(`${errMsg}! Error: ${ServerErrNoRetryMap[code]}`));
            return;
        }
        // Error that we should submit to client project.
        if (statusCode && statusCode === 400) {
            // Reset ctx timeline to prevent leaking any privacy data that shouldn't be submitted.
            this.resetCtxTimeline(activeDomain);
            this.trackConsoleError(activeDomain, [logMessages_1.filterStructureExceptionMsg]);
            this.trackConsoleError(activeDomain, [`${err.message}.`, 'Reasons: ', err.reasons]);
            this.trackConsoleError(activeDomain, ['The corrupted payload', err.reqBody]);
            const ctxArgs = this.trackStringErrorTimelineItem(activeDomain, [`Djaty.onBeforeSubmission() caused an error: ${err.message}`]);
            this.sendUserFilterError(activeDomain, ctxArgs, err, cb);
            return;
        }
        // Error that we should submit to client project.
        if (statusCode && statusCode === 429) {
            cb(new utils.DjatyError(`${errMsg}! Error: Too many requests!`));
            return;
        }
        if (statusCode && statusCode < 500) {
            cb(new utils.DjatyError(`${errMsg}! Error: Make sure \`server\` config is correct.`));
            return;
        }
        // Else, Unknown error send it to Djaty.
        this.submitDjatyCrashReport(err, cb);
    }
    getContext(activeDomain) {
        if (!activeDomain) {
            return this.globalCtx;
        }
        if (!utils.isDjatyReqWrapDomain(activeDomain)) {
            // A guard to prevent tracking errors inside a nested domain.
            return {};
        }
        if (!activeDomain.djatyContext) {
            activeDomain.djatyContext = {};
        }
        return activeDomain.djatyContext;
    }
    /**
     * Use `this.trackConsoleError` and not `console.log` as `console.log` internally will add
     * the timeline item to the active domain which is `this.djatyInternalErrorsDomain`
     * and not the current domain of the request (Which the `req` and `res` objects are added to).
     *
     * @param activeDomain
     * @param {[]} consoleParams
     */
    trackConsoleError(activeDomain, consoleParams) {
        utils.consoleAlertError.apply(undefined, consoleParams);
        this.trackStringErrorTimelineItem(activeDomain, consoleParams);
    }
    onAfterErrorHandled() {
        this.exitStackedDomains();
        if (!this.options.exitOnUncaughtExceptions) {
            return;
        }
        utils.consoleAlert('Exiting the process...');
        process.exit(1);
    }
    /**
     * Use `this.trackStringErrorTimelineItem` and not `console.error` as `console.error` internally
     * will add the timeline item to the active domain which is `this.djatyInternalErrorsDomain`
     * and not the current domain of the request (Which the `req` and `res` objects are added to).
     *
     * @param {ActiveDomain} activeDomain
     * @param {[]} consoleParams
     * @return {ContextArgs}
     */
    trackStringErrorTimelineItem(activeDomain, consoleParams) {
        const consoleItem = utils.formatConsoleItem('error', consoleParams);
        this.trackTimelineItem(activeDomain, consoleItem);
        const shortTitle = JSON.stringify(consoleParams).substr(0, 255);
        return {
            longTitle: shortTitle,
            shortTitle,
            hash: consoleItem.hash,
        };
    }
    onDjatyDomainError(err) {
        utils.consoleAlert('Djaty crashed! Submitting the crash report...');
        this.submitDjatyCrashReport(err, (submissionErr, ack) => {
            // Submission failed
            if (submissionErr) {
                if (submissionErr instanceof utils.DjatyError) {
                    // Cannot submit for a known reason.
                    utils.consoleAlertError(submissionErr);
                    this.onAfterErrorHandled();
                    return;
                }
                // Cannot submit for an unknown reason, just log it.
                utils.consoleAlertError('Unknown submission err: ', submissionErr, 'Original err:', err);
                this.onAfterErrorHandled();
                return;
            }
            if (ack === utils.ProcessAcknowledge.DJATY_CRASH_REPORT_DISABLED) {
                utils.consoleAlert('Djaty has encountered a problem and the crash report cannot be' +
                    ' sent. For a better experience and to help us fix those kinds of problems in the' +
                    ' future, please enable \'reportDjatyCrashes\' option.');
                this.onAfterErrorHandled();
                return;
            }
            utils.consoleAlert('Djaty crash report submitted successfully.');
            this.onAfterErrorHandled();
        });
    }
    process(activeDomain, agentData, cb) {
        const domainCtx = this.getContext(activeDomain);
        // Allow filtering the context data right before submission.
        const beforeSubmissionCtxCbList = domainCtx.beforeSubmissionContextHandlerList || [];
        const filterList = [...this.beforeSubmissionHandlerList, ...beforeSubmissionCtxCbList];
        utils.asyncLoop(filterList, [_.cloneDeep(agentData)], this, (err, filteredData) => {
            if (err) {
                // Reset ctx timeline to prevent leaking any privacy data that shouldn't be submitted.
                this.resetCtxTimeline(activeDomain);
                this.trackConsoleError(activeDomain, [logMessages_1.filterUncaughtExceptionMsg]);
                // Use `trackExceptionItem` and not `captureError` to avoid infinite loops.
                const exception = this.trackExceptionItem(err, activeDomain);
                const shortTitle = exception.msg.substr(0, 255);
                const ctxArgs = {
                    hash: exception.hash,
                    shortTitle,
                    longTitle: shortTitle,
                };
                this.sendUserFilterError(activeDomain, ctxArgs, err, cb);
                return;
            }
            this.transport.send({ data: filteredData }, sendErr => {
                if (sendErr) {
                    return this.handleSubmissionErr(sendErr, activeDomain, cb);
                }
                cb(sendErr);
            });
        });
    }
    prepareSubmissionPayload(activeDomain, ctxArgs) {
        const currCtx = this.getContext(activeDomain);
        let timeline;
        if (currCtx.timeline && currCtx.isTimelineTrimmed) {
            const trimItems = currCtx.trimmedItems;
            // noinspection JSUnusedAssignment
            timeline = [...trimItems, ...currCtx.timeline];
        }
        timeline = timeline || ctxArgs.timeline || currCtx.timeline || this.globalCtx.timeline;
        const djatyReqId = currCtx.djatyReqId || this.globalCtx.djatyReqId;
        const customDataContextList = currCtx.customDataContextList || [];
        const customData = [...this.customDataList, ...customDataContextList];
        const { trackingOptions, allowAutoSubmission, release, apiSecret, apiKey } = this.options;
        let reqCurrUser = {};
        if (activeDomain && activeDomain.__name === 'djatyReqWrapDomain') {
            reqCurrUser = this.getUserFromReq(activeDomain, trackingOptions.parseUser);
        }
        const user = Object.assign({}, ctxArgs.user, reqCurrUser, currCtx.user);
        const agentBatchItem = {
            bugType: _.last(timeline).itemType,
            customData: customData.length ? customData : undefined,
            djatyReqId,
            hash: ctxArgs.hash,
            isTemp: !allowAutoSubmission && !!djatyReqId,
            longTitle: ctxArgs.longTitle,
            shortTitle: ctxArgs.shortTitle,
            timeline,
            user: _.isEmpty(user) ? undefined : user,
        };
        return {
            agentDataPatch: [agentBatchItem],
            agentId: constants_1.AGENT_ID,
            agentVersion: constants_1.DJATY_VERSION,
            apiKey: apiKey,
            apiSecret: apiSecret,
            hashType: 'sha256',
            platform: constants_1.PLATFORM,
            platformVersion: typeof process.version !== 'undefined' ? process.version : undefined,
            // Only include release information if it is set
            release,
            // `::1` This is the IPv6 `127.0.0.1` equivalent (Customer can config his machine to control
            // to enable or disable ipv6 for the his `localhost` hostname)
            serverLocalIp: serverLocalIp === '::1' ? '127.0.0.1' : serverLocalIp,
            serverName: computerName(),
            stage: ctxArgs.stage || this.globalCtx.stage,
            tags: ctxArgs.tags || this.globalCtx.tags,
        };
    }
    submitDjatyCrashReport(djatyErr, cb) {
        utils.djatyDebug('Djaty.submitDjatyCrashReport()', djatyErr);
        if (!this.options.reportDjatyCrashes) {
            cb(undefined, utils.ProcessAcknowledge.DJATY_CRASH_REPORT_DISABLED);
            return;
        }
        if (this.options.exitOnUncaughtExceptions) {
            // Prevent recursions
            if (this.isDjatyCrashExceptionCaught) {
                return;
            }
            this.isDjatyCrashExceptionCaught = true;
        }
        let isSent = false;
        setTimeout(() => {
            if (isSent) {
                return;
            }
            const timeoutErr = new Error('`submitDjatyCrashReport` timed out! Current error ' +
                'is not tracked!');
            this.isDjatyCrashExceptionCaught = false;
            utils.djatyDebug('submitDjatyCrashReport()', 'djatySubmissionCb', 'Err: ', timeoutErr);
            cb(timeoutErr);
            // `unref()`: Don't keep the process open! If there is no other activity keeping the event
            // loop running, let the process exit normally without waiting the callback to be invoked.
        }, this.options.submissionTimeout).unref();
        const exception = utils.parseError(djatyErr, this.maxStacktraceFramesNo);
        exception.timestamp = +new Date();
        const shortTitle = exception.msg.substr(0, 255);
        // Generating the anonymous bug data
        const agentData = {
            agentDataPatch: [{
                    bugType: exception.itemType,
                    customData: [{ apiKey: this.options.apiKey }],
                    hash: exception.hash,
                    isTemp: false,
                    shortTitle,
                    longTitle: shortTitle,
                    timeline: [exception],
                }],
            agentId: constants_1.AGENT_ID,
            agentVersion: constants_1.DJATY_VERSION,
            hashType: 'sha256',
            platform: constants_1.PLATFORM,
            serverName: 'Anonymous',
            serverLocalIp: 'Anonymous',
            platformVersion: typeof process.version !== 'undefined' ? process.version : undefined,
        };
        this.transport.send({ data: agentData, isReport: true }, (sendErr) => {
            if (sendErr) {
                cb(sendErr);
                return;
            }
            isSent = true;
            cb(undefined, utils.ProcessAcknowledge.DJATY_CRASH_REPORT_SENT);
        });
    }
    initTrackingOptions(trackingOpts) {
        if (trackingOpts.parseUser === true) {
            trackingOpts.parseUser = this.coreConfig.parseUser;
        }
        this.maxTimelineItems = Math.min(trackingOpts.timelineLimit, this.coreConfig.timelineMaxLimit);
        this.maxStacktraceFramesNo = Math.min(trackingOpts.stacktraceLimit, this.coreConfig.stacktraceMaxLimit);
        _.each(trackingOpts.allowedWrappers, (wrapperOptions, key) => {
            if (!wrapperOptions) {
                return;
            }
            const instrumentOptions = { key };
            const hasWrapperOptions = _.keys(wrapperOptions).length;
            if (hasWrapperOptions) {
                instrumentOptions.wrapperOpts = wrapperOptions;
            }
            trackingWrappers.instrument(instrumentOptions, this);
        });
    }
    registerExceptionHandler() {
        const errType = 'uncaughtException';
        process.on(errType, (err) => {
            utils.consoleAlertError(`${errType}:`, err);
            this.captureError(err);
        });
    }
    /**
     * The 'unhandledRejection' event is emitted whenever a Promise is rejected and no error handler
     * is attached to the promise within a turn of the event loop.
     */
    registerRejectionHandler() {
        const errType = 'unhandledRejection';
        process.on(errType, (err) => {
            utils.consoleAlertError(`${errType}:`, err);
            this.captureError(err, errType);
        });
    }
    setContext(activeDomain, ctx) {
        if (!activeDomain) {
            this.globalCtx = ctx;
            return;
        }
        if (!utils.isDjatyReqWrapDomain(activeDomain)) {
            // A guard to prevent tracking errors inside a nested domain.
            return;
        }
        activeDomain.djatyContext = ctx;
    }
    resetCtxTimeline(activeDomain) {
        const currCtx = this.getContext(activeDomain);
        currCtx.isTimelineTrimmed = false;
        const firstItem = currCtx.timeline[0];
        const trimmingItem = { timestamp: +new Date(), itemType: timelineItemTypes_1.TimelineItemTypes.TRIMMING };
        if (!firstItem || !activeDomain || activeDomain.__name !== 'djatyReqWrapDomain' ||
            firstItem.itemType !== timelineItemTypes_1.TimelineItemTypes.HTTP_REQ ||
            !firstItem.djatyReqId) {
            currCtx.timeline = [trimmingItem];
            this.setContext(activeDomain, currCtx);
            return;
        }
        currCtx.timeline = [firstItem, trimmingItem];
        this.setContext(activeDomain, currCtx);
    }
    /**
     * captureError
     *
     * @param err: `any` as the err can result from `throw 'text or anything else'`
     * @param errType
     */
    captureError(err, errType = 'uncaughtException') {
        // Catching the request domain context before using the `djatyInternalErrorsDomain`.
        const activeDomain = domain.active;
        if (activeDomain && !utils.isDjatyReqWrapDomain(activeDomain)) {
            // A guard to prevent tracking errors inside a nested user domain.
            utils.consoleAlertError('Nested Domain! Tracking disabled for current request.');
            this.onAfterErrorHandled();
            return;
        }
        this.djatyInternalErrorsDomain.run(() => {
            return this.wrapWithTryCatch(() => {
                // To exclude Djaty validation installation exceptions
                if (err instanceof utils.DjatyError) {
                    this.trackConsoleError(activeDomain, [`${errType}:`, err]);
                    return;
                }
                if (this.options.exitOnUncaughtExceptions) {
                    if (this.isUncaughtExceptionCaught) {
                        return;
                    }
                    this.isUncaughtExceptionCaught = true;
                }
                let isSent = false;
                setTimeout(() => {
                    if (isSent) {
                        return;
                    }
                    utils.consoleAlertError('An error has been tracked but not submitted as the tracking ' +
                        'process has timed out!', 'error:', err);
                    this.onAfterErrorHandled();
                    // `unref()`: Don't keep the process open! If there is no other activity keeping the event
                    // loop running, let the process exit normally without waiting the callback to be invoked.
                }, this.options.submissionTimeout).unref();
                const exception = this.trackExceptionItem(err, activeDomain);
                const shortTitle = exception.msg.substr(0, 255);
                const ctxArgs = {
                    hash: exception.hash,
                    shortTitle,
                    longTitle: shortTitle,
                };
                const agentData = this.prepareSubmissionPayload(activeDomain, ctxArgs);
                this.process(activeDomain, agentData, (processErr, ack) => {
                    if (!this.options.allowAutoSubmission) {
                        this.onAfterErrorHandled();
                        return;
                    }
                    isSent = true;
                    // Submission failed
                    if (processErr) {
                        if (processErr instanceof utils.DjatyError) {
                            // Cannot submit for a known reason.
                            this.trackConsoleError(activeDomain, [processErr]);
                            this.onAfterErrorHandled();
                            return;
                        }
                        // Cannot submit for an unknown reason, just log it.
                        utils.consoleAlertError('Unknown submission err: ', processErr, 'Original err:', err);
                        this.onAfterErrorHandled();
                        return;
                    }
                    // Submission done successfully
                    if (ack === utils.ProcessAcknowledge.USER_FILTER_ERROR) {
                        utils.consoleAlert('Djaty.onBeforeSubmission() is not configured properly. ' +
                            'A detailed bug reported.');
                        this.onAfterErrorHandled();
                        return;
                    }
                    if (ack === utils.ProcessAcknowledge.DJATY_CRASH_REPORT_SENT) {
                        utils.consoleAlert('Djaty crash report submitted successfully.');
                        this.onAfterErrorHandled();
                        return;
                    }
                    if (ack === utils.ProcessAcknowledge.DJATY_CRASH_REPORT_DISABLED) {
                        utils.consoleAlert('Djaty has encountered a problem and the crash report cannot be' +
                            ' sent. For a better experience and to help us fix those kinds of problems in the' +
                            ' future, please enable \'reportDjatyCrashes\' option.');
                        this.onAfterErrorHandled();
                        return;
                    }
                    utils.consoleAlert(`${errType} reported`, err.message ? `: ${err.message}` : '');
                    this.onAfterErrorHandled();
                });
            });
        });
    }
    sendUserFilterError(activeDomain, ctxArgs, filterErr, cb) {
        const agentData = this.prepareSubmissionPayload(activeDomain, ctxArgs);
        this.transport.send({ data: agentData }, sendErr => {
            if (!sendErr) {
                cb(undefined, utils.ProcessAcknowledge.USER_FILTER_ERROR);
                return;
            }
            utils.djatyDebug('Djaty.sendUserFilterError()', 'The current validation schema for Djaty ' +
                'config has differences from the server schema. This caused request to be refused. ' +
                'Reasons:', sendErr.reasons, 'filterErr:', filterErr);
            return;
        });
    }
    trackExceptionItem(err, activeDomain) {
        const currCtx = this.getContext(activeDomain);
        if (!this.options.allowAutoSubmission && !currCtx.djatyReqId) {
            return;
        }
        if (!(err instanceof Error)) {
            // This handles when someone does:
            //   throw 'something awesome';
            // We synthesize an Error here so we can extract a (rough) stack trace.
            err = new Error(err);
        }
        const exception = utils.parseError(err, this.maxStacktraceFramesNo);
        this.trackTimelineItem(activeDomain, exception);
        return exception;
    }
    wrap(func) {
        let djatyReqWrapDomain = domain.active;
        if (!djatyReqWrapDomain || djatyReqWrapDomain.__name !== 'djatyReqWrapDomain') {
            djatyReqWrapDomain = domain.create();
            djatyReqWrapDomain.__name = 'djatyReqWrapDomain';
        }
        djatyReqWrapDomain.on('error', this.captureError.bind(this));
        // `try/catch` is a workaround. As domains internally depend on a special
        // `uncaughtException` event to catch errors, they don't catch sync errors that are swallowed
        // and not cause this special `uncaughtException` event to be emitted.
        // Check this issue: https://github.com/nodejs/node/issues/22400
        // So, we must use `try/catch` every time we use `domain.run()` as it always prevents
        // the error from being swallowed.
        // `run()` sets the domain.active
        return djatyReqWrapDomain.run(() => {
            try {
                return func.call(this);
            }
            catch (err) {
                this.captureError(err);
            }
        });
    }
    getUserFromReq(activeDomain, parseUser) {
        // activeDomain!.members[0] is the req added earlier on calling `activeDomain.add(req)`
        const req = activeDomain.members[0];
        let user = {};
        user.userIp = utils.getReqIP(req);
        // user: typically found on req.user in express/passport patterns
        // `parseUser` cases:
        //   - false: don't pick userId or logon.
        //   - object: properties that we should use instead of 'userId', 'username'. For example:
        //             {userId: 'user_id', logon: 'email'}
        //   - function: receives the `req` and returns the user object {userId, logon}.
        if (parseUser === false) {
            return user;
        }
        if (typeof parseUser === 'function') {
            let userFromFn;
            try {
                userFromFn = parseUser(req);
            }
            catch (err) {
                this.trackConsoleError(activeDomain, ['We cannot parse the user from request object' +
                        ' as the `parseUser` config function throws the following error:', utils.getErrorObj(err)]);
                return user;
            }
            if (!this.isTrackedUserValidObj(activeDomain, userFromFn)) {
                return user;
            }
            const { userId, logon } = userFromFn;
            return Object.assign(user, { userId, logon });
        }
        if (req.user) {
            let userFromObj = {};
            parseUser = parseUser;
            if (parseUser.userId) {
                userFromObj.userId = req.user[parseUser.userId];
            }
            if (parseUser.logon) {
                userFromObj.logon = req.user[parseUser.logon];
            }
            if (!this.isTrackedUserValidObj(activeDomain, userFromObj)) {
                return user;
            }
            return Object.assign(user, userFromObj);
        }
        return user;
    }
    isTrackedUserValidObj(activeDomain, user) {
        if (!user || !_.isObject(user)) {
            this.trackConsoleError(activeDomain, ['Cannot parse the user. User must be an object.']);
            return false;
        }
        const { userId, logon } = user;
        if (!userId && !logon) {
            this.trackConsoleError(activeDomain, ['We cannot parse the user. User object there has' +
                    ' no `logon` or `userId` properties.']);
            return false;
        }
        if (!_.isString(userId) && !_.isNumber(userId) && !_.isString(logon) && !_.isNumber(logon)) {
            this.trackConsoleError(activeDomain, ['`user.userId` and `user.logon` are not String ' +
                    'or Number']);
            return false;
        }
        return true;
    }
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
    wrapWithTryCatch(cb) {
        try {
            return cb();
        }
        catch (err) {
            if (err instanceof utils.DjatyError) {
                throw err;
            }
            this.onDjatyDomainError(err);
        }
    }
    /**
     * Exiting stacked Domains to avoid leaking the context between server requests.
     * Ref: https://github.com/nodejs/node/issues/26081
     * @TODO, find better solution
     */
    exitStackedDomains() {
        const domainList = ['djatyReqWrapDomain', 'djatyAsyncLoopDomain', 'djatyInternalErrorsDomain'];
        (domain._stack || []).forEach(stacked => {
            if (!domainList.includes(stacked.__name)) {
                return;
            }
            stacked.exit();
        });
    }
}
Djaty.DJATY_NOT_VALID_API_KEY = 'djaty_isApiKeyValid';
Djaty.USER_CONFIG_SCHEMA = 'userConfigSchema';
exports.Djaty = Djaty;
//noinspection JSUnusedGlobalSymbols
exports.djaty = Djaty.getInstance(new coreConfigs_1.CoreConfig());
var allowedCustomLoggers_1 = require("./customLogger/allowedCustomLoggers");
exports.AllowedCustomLoggers = allowedCustomLoggers_1.AllowedCustomLoggers;
var validationDefaults_1 = require("./config/validationDefaults");
exports.DefaultStages = validationDefaults_1.DefaultStages;
//# sourceMappingURL=index.js.map