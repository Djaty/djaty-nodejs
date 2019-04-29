import {AllowedWrappers} from './allowedWrappers';
import {TrackedUserBase} from './trackedUserBase';

export interface TrackingOptions {
  allowedWrappers: boolean | AllowedWrappers;
  captureUnhandledRejections: boolean;
  timelineLimit: number;
  parseUser: boolean | Function | TrackedUserBase;
  stacktraceLimit: number;
}
