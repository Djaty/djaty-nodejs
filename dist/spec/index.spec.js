"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const _ = require("lodash");
const nock = require("nock");
// tslint:disable-next-line no-require-imports
// const sinon = require('sinon');
const _1 = require("../");
const utils = require("../utils");
const djatyErrorCodes_1 = require("../consts/djatyErrorCodes");
const sdkOptions = {
    apiKey: 'xxxx-xxxx-xxxx-xxxx',
    apiSecret: 'xxxx-xxxx-xxxx-xxxx',
    // A flag is used only for testing so don't expose in the options interface.
    disableDjatyDomainErrors: true,
};
const expect = chai.expect;
describe('djaty.version', () => {
    it('should be valid', () => {
        expect(_1.djaty.version).to.match(/^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/);
    });
    it('should match package.json', () => {
        // tslint:disable-next-line no-require-imports
        const version = require('../../package.json').version;
        expect(_1.djaty.version).to.eq(version);
    });
});
describe('djaty SDK', () => {
    let sdk;
    beforeEach(() => {
        utils.disableConsoleAlerts();
        sdk = _.cloneDeep(_1.djaty);
    });
    afterEach(() => {
        utils.enableConsoleAlerts();
        sdk = _.cloneDeep(_1.djaty);
    });
    it('should config DJATY_IS_TRACKING and DJATY_RELEASE properly from environment', () => {
        process.env.DJATY_IS_TRACKING = 'false';
        expect(sdk.init(sdkOptions).getOptions().djatyIsTracking).to.eq(false);
        process.env.DJATY_IS_TRACKING = 'true';
        process.env.DJATY_RELEASE = '0.1.51';
        expect(sdk.destroy().init(sdkOptions).getOptions().release).to.eq('0.1.51');
        process.env.DJATY_IS_TRACKING = 'anyOtherStr';
        expect(sdk.init(sdkOptions).getOptions().djatyIsTracking).to.eq(true);
        delete process.env.DJATY_IS_TRACKING;
        delete process.env.DJATY_RELEASE;
    });
    it('should throw if initiated with no options and api keys are not exist at' +
        ' the environment.', () => {
        expect(sdk.init.bind(sdk)).to.throw();
    });
    it('should accept DJATY_API_KEY and DJATY_API_SECRET properly from environment.', () => {
        process.env.DJATY_API_KEY = sdkOptions.apiKey;
        process.env.DJATY_API_SECRET = sdkOptions.apiSecret;
        expect(sdk.init().isInitiated).to.eq(true);
        delete process.env.DJATY_API_KEY;
        delete process.env.DJATY_API_SECRET;
    });
    it('should be disabled when options are not passed', () => {
        expect(sdk.init.bind(sdk)).to.throw();
    });
    it('should be disabled when options are passed but invalid', () => {
        const inValidOptions = {
            x: 5,
        };
        expect(sdk.init.bind(sdk, inValidOptions)).to.throw();
    });
});
describe('djaty.trackBug()', () => {
    let sdk;
    beforeEach(() => {
        utils.disableConsoleAlerts();
        sdk = _.cloneDeep(_1.djaty);
        nock('https://bugs.djaty.com')
            .persist()
            .post('/api/bugs')
            .reply(200, 'Ok');
    });
    afterEach(() => {
        utils.enableConsoleAlerts();
        sdk = _.cloneDeep(_1.djaty);
        nock.cleanAll();
    });
    it('should receive a string and submit the bug to Djaty server', () => __awaiter(this, void 0, void 0, function* () {
        const result = yield sdk.init(sdkOptions).trackBug('Test bug!!!');
        expect(result).to.eq(_1.SubmissionAcknowledge.BUG_REPORTED);
    }));
    it('should receive an Error and submit the bug to Djaty server', () => __awaiter(this, void 0, void 0, function* () {
        const result = yield sdk.init(sdkOptions).trackBug(new Error('Test bug!!!'));
        expect(result).to.eq(_1.SubmissionAcknowledge.BUG_REPORTED);
    }));
    it('should throw `NOT_INITIATED` Error if djaty is not initiated to Djaty server', () => {
        return sdk.trackBug(new Error('Test bug!!!')).catch((err) => {
            if (err.code !== djatyErrorCodes_1.DjatyErrorCodes.NOT_INITIATED) {
                throw err;
            }
        });
    });
    it('should not throw `NO_DJATY_REQ_ID_FOR_TEMP_BUG` Error if `allowAutoSubmission` is false ' +
        'and current context has no `djatyReqId`', () => __awaiter(this, void 0, void 0, function* () {
        const sdkMergedOpts = Object.assign({}, sdkOptions, {
            allowAutoSubmission: false,
        });
        const result = yield sdk.init(sdkMergedOpts).trackBug(new Error('Test bug!!!'));
        expect(result).to.eq(_1.SubmissionAcknowledge.SKIPPED_DJATY_EXTENSION_NOT_DETECTED);
    }));
});
//# sourceMappingURL=index.spec.js.map