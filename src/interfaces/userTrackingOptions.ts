import {AllowedWrappers} from './allowedWrappers';

export interface UserTrackingOptions {
  // Default: {console: true, http: true}
  // To control which timeline items should be tracked: Console, HTTP, ... or set it to false
  // to track only exceptions. Default is to track `console` and `http` timeline items.
  allowedWrappers?: AllowedWrappers;

  // Default: true
  // To capture Promises that throws an exception without being caught with `.catch()`.
  captureUnhandledRejections?: boolean;

  // The max allowed number of timeline items keeping the first item from being removed
  // as it presents the request entry point that tracks the route, ...
  timelineLimit?: number;

  // Default: true
  // To control how our wrappers track the current user object. Default value is `true` that allow
  // the agent to pick the `userId` and the `username` (to be displayed at Djaty dashboard
  // as user `logon`) properties from the `req.user` object.
  // To change this behaviour, `parseUser` can be one of the following values:
  // - `false`: Prevent tracking `userId` and `username`.
  // - `function`: That receives the `req` object and should return a user object
  //   with the following structure: `{userId: number|string, logon: number|string}`.
  parseUser?: boolean | Function;

  // The max allowed number of stacktrace frames when Djaty captures an exception.
  stacktraceLimit?: number;
}
