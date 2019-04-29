import {AgentData} from './agentData';
import {DjatyCrashReportAgentData} from './djatyCrashReportAgentData';

export interface TransportSendOptions {
  data: AgentData | DjatyCrashReportAgentData;
  isReport?: boolean;
}
