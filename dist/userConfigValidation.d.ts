import { AllowedCustomLoggers } from './customLogger/allowedCustomLoggers';
export declare const userConfigSchema: {
    type: string;
    additionalProperties: boolean;
    properties: {
        apiKey: {
            type: string;
        };
        apiSecret: {
            type: string;
        };
        djatyIsTracking: {
            type: string;
        };
        allowAutoSubmission: {
            type: string;
        };
        exitOnUncaughtExceptions: {
            type: string;
        };
        reportDjatyCrashes: {
            type: string;
        };
        onBeforeBugSubmission: {
            'instanceof': string;
        };
        proxy: {
            type: string;
            additionalProperties: boolean;
            properties: {
                ca: {
                    'instanceof': string;
                };
                hostname: {
                    type: string;
                    format: string;
                };
                port: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                secure: {
                    type: string;
                };
            };
        };
        release: {
            type: string;
            maxLength: number;
            minLength: number;
        };
        server: {
            type: string;
            additionalProperties: boolean;
            properties: {
                apiPath: {
                    type: string;
                };
                ca: {
                    'instanceof': string;
                };
                hostname: {
                    type: string;
                    format: string;
                };
                port: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                secure: {
                    type: string;
                };
            };
        };
        showDjatyLogs: {
            type: string;
        };
        stage: {
            type: string;
            maxLength: number;
            minLength: number;
            'enum': string[];
        };
        tags: {
            type: string;
            items: {
                type: string;
                pattern: string;
                errorMessage: {
                    pattern: string;
                };
            };
            maxItems: number;
            uniqueItems: boolean;
        };
        trackingOptions: {
            type: string;
            additionalProperties: boolean;
            properties: {
                allowedWrappers: {
                    type: string;
                    additionalProperties: boolean;
                    properties: {
                        console: {
                            type: string;
                        };
                        customLoggers: {
                            type: string;
                            items: {
                                type: string;
                                additionalProperties: boolean;
                                properties: {
                                    name: {
                                        'enum': AllowedCustomLoggers[];
                                    };
                                };
                                required: string[];
                            };
                        };
                        http: {
                            type: string;
                        };
                        stdLogs: {
                            type: string;
                        };
                    };
                };
                captureUnhandledRejections: {
                    type: string;
                };
                parseUser: {
                    anyOf: ({
                        'instanceof': string;
                        type?: undefined;
                    } | {
                        type: string;
                        instanceof?: undefined;
                    })[];
                };
                stacktraceLimit: {
                    type: string;
                };
                timelineLimit: {
                    type: string;
                };
            };
        };
        disableDjatyDomainErrors: {
            type: string;
        };
    };
    required: string[];
};
