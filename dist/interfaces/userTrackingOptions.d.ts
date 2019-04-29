import { AllowedWrappers } from './allowedWrappers';
export interface UserTrackingOptions {
    allowedWrappers?: AllowedWrappers;
    captureUnhandledRejections?: boolean;
    timelineLimit?: number;
    parseUser?: boolean | Function;
    stacktraceLimit?: number;
}
