import {UserProxyConfig} from './userProxyConfig';
import {UserServerConfig} from './userServerConfig';
import {UserTrackingOptions} from './userTrackingOptions';
import {AgentData} from './agentData';
import {DefaultStages} from '..';

export interface UserConfigOptions {
  apiKey?: string;
  apiSecret?: string;

  // Default true. If false, Djaty will not functioning at all as if it's not integrated.
  djatyIsTracking?: boolean;

  // An object to control the behaviour of timeline items tracking. All properties are optional.
  trackingOptions?: UserTrackingOptions;

  // Server information that should be used in case of hosting Djaty servers locally.
  // All properties are optional
  server?: UserServerConfig;

  // Proxy information that should be used in case of hosting Djaty servers locally.
  // All properties are optional
  proxy?: UserProxyConfig;

  // The current release version of the app or the script
  release?: string;

  // Optional machine identifying tags.
  tags?: string[];

  // Optional machine identifying stage.
  stage?: DefaultStages;

  // Callback function to be executed to filter context data right before submission
  onBeforeBugSubmission?: (data: AgentData, next: (data: AgentData) => void) => void;

  // Control to allow or not tracked uncaught exceptions to be automatically submitted.
  allowAutoSubmission?: boolean;

  // Allow our logs messages to be printed to the console.
  showDjatyLogs?: boolean;

  // Force the process to exit when the sdk tracks an uncaught exception.
  exitOnUncaughtExceptions?: boolean;
}
