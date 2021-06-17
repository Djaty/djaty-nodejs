import * as chai from 'chai';
import * as _ from 'lodash';
import * as nock from 'nock';

// tslint:disable-next-line no-require-imports
// const sinon = require('sinon');

import {djaty, UserConfigOptions, SubmissionAcknowledge} from '../';
import {DjatyInterface} from '../interfaces/djatyInterface';
import * as utils from '../utils';
import {DjatyErrorCodes} from '../consts/djatyErrorCodes';

const sdkOptions = <UserConfigOptions> {
  apiKey: 'xxxx-xxxx-xxxx-xxxx',
  apiSecret: 'xxxx-xxxx-xxxx-xxxx',

  // A flag is used only for testing so don't expose in the options interface.
  disableDjatyDomainErrors: true,
};

const expect = chai.expect;
describe('djaty.version', () => {
  it('should be valid', () => {
    expect(djaty.version).to.match(/^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/);
  });

  it('should match package.json', () => {
    // tslint:disable-next-line no-require-imports
    const version = require('../../package.json').version;
    expect(djaty.version).to.eq(version);
  });
});

describe('djaty SDK', () => {
  let sdk: DjatyInterface;

  beforeEach(() => {
    utils.disableConsoleAlerts();
    sdk = _.cloneDeep(djaty);
  });

  afterEach(() => {
    utils.enableConsoleAlerts();
    sdk = _.cloneDeep(djaty);
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
    const inValidOptions: any = {
      x: 5,
    };

    expect(sdk.init.bind(sdk, inValidOptions)).to.throw();
  });
});

describe('djaty.trackBug()', () => {
  let sdk: DjatyInterface;

  beforeEach(() => {
    utils.disableConsoleAlerts();
    sdk = _.cloneDeep(djaty);
    nock('https://bugs.djaty.com')
      .persist()
      .post('/api/bugs')
      .reply(200, 'Ok');
  });

  afterEach(() => {
    utils.enableConsoleAlerts();
    sdk = _.cloneDeep(djaty);
    nock.cleanAll();
  });

  it('should receive a string and submit the bug to Djaty server', async () => {
    const result = await sdk.init(sdkOptions).trackBug('Test bug!!!');
    expect(result).to.eq(SubmissionAcknowledge.BUG_REPORTED);
  });

  it('should receive an Error and submit the bug to Djaty server', async () => {
    const result = await sdk.init(sdkOptions).trackBug(new Error('Test bug!!!'));
    expect(result).to.eq(SubmissionAcknowledge.BUG_REPORTED);
  });

  it('should throw `NOT_INITIATED` Error if djaty is not initiated to Djaty server', () => {
    return sdk.trackBug(new Error('Test bug!!!')).catch((err: utils.DjatyError) => {
      if (err.code !== DjatyErrorCodes.NOT_INITIATED) {
        throw err;
      }
    });
  });

  it('should not throw `NO_DJATY_REQ_ID_FOR_TEMP_BUG` Error if `allowAutoSubmission` is false ' +
    'and current context has no `djatyReqId`', async () => {

    const sdkMergedOpts: UserConfigOptions = Object.assign({}, sdkOptions, {
      allowAutoSubmission: false,
    });

    const result = await sdk.init(sdkMergedOpts).trackBug(new Error('Test bug!!!'));
    expect(result).to.eq(SubmissionAcknowledge.SKIPPED_DJATY_EXTENSION_NOT_DETECTED);
  });
});
