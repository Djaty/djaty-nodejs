export declare class CoreConfig {
    hostname: string;
    apiPath: string;
    timelineDefaultMaxLimit: number;
    allowAutoSubmission: boolean;
    timelineMaxLimit: number;
    stacktraceDefaultMaxLimit: number;
    stacktraceMaxLimit: number;
    exceptionTrackingTimeout: number;
    djatyIsTracking: boolean;
    allowedWrappers: {
        console: boolean;
        http: boolean;
    };
    parseUser: {
        userId: string;
        logon: string;
    };
}
