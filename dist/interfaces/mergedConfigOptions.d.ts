import { TrackingOptions } from './trackingOptions';
import { ServerConfig } from './serverConfig';
import { AgentData } from './agentData';
/**
 * The type of the data result from merging user config and core config.
 */
export interface MergedConfigOptions {
    apiKey: string;
    apiSecret: string;
    server: ServerConfig;
    trackingOptions: TrackingOptions;
    tags: string[];
    exitOnUncaughtExceptions: boolean;
    allowAutoSubmission: boolean;
    showDjatyLogs: boolean;
    djatyIsTracking?: boolean;
    reportDjatyCrashes?: boolean;
    proxy?: ServerConfig;
    release?: string;
    stage?: string;
    onBeforeBugSubmission?: (data: AgentData, next: (data: AgentData) => void) => void;
}
