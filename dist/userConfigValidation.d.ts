export declare const userConfigSchema: {
    type: string;
    additionalProperties: boolean;
    properties: Record<"server" | "apiKey" | "apiSecret" | "djatyIsTracking" | "trackingOptions" | "proxy" | "release" | "tags" | "stage" | "onBeforeBugSubmission" | "allowAutoSubmission" | "showDjatyLogs" | "exitOnUncaughtExceptions" | "submissionTimeout", any>;
    required: string[];
};
