export class CoreConfig {
  hostname = 'bugs.djaty.com';
  apiPath = '/api';

  // If user doesn't define a value for timelineLimit this value will be used.
  timelineDefaultMaxLimit = 30;

  allowAutoSubmission = true;

  // If user defines a value for timelineLimit higher than this value this value will be used.
  timelineMaxLimit = 100;

  // If user doesn't define a value for stacktraceLimit this value will be used.
  stacktraceDefaultMaxLimit = 40;

  // If user defines a value for stacktraceLimit higher than this value this value will be used.
  stacktraceMaxLimit = 100;

  // Skip bug report submission if it takes more than this value.
  // This value should be small as possible as the server state at this duration may be inconsistent
  // due to the exception thrown and it may go further with this state or even receive new requests.
  // noinspection PointlessArithmeticExpressionJS
  submissionTimeout = 1 * 1000;

  djatyIsTracking = true;

  allowedWrappers = {
    console: true,
    http: true,
  };

  parseUser = {
    userId: 'userId',
    logon: 'username',
  };
}
