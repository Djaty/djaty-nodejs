import { UserProxyConfig } from './userProxyConfig';
import { UserServerConfig } from './userServerConfig';
import { UserTrackingOptions } from './userTrackingOptions';
import { AgentData } from './agentData';
import { DefaultStages } from '..';
export interface UserConfigOptions {
    apiKey: string;
    apiSecret: string;
    djatyIsTracking?: boolean;
    trackingOptions?: UserTrackingOptions;
    server?: UserServerConfig;
    proxy?: UserProxyConfig;
    release?: string;
    tags?: string[];
    stage?: DefaultStages;
    onBeforeBugSubmission?: (data: AgentData, next: (data: AgentData) => void) => void;
    allowAutoSubmission?: boolean;
    showDjatyLogs?: boolean;
    exitOnUncaughtExceptions?: boolean;
}
