import {AgentBatchItem} from './agentBatchItem';

export interface DjatyCrashReportAgentData {
  agentDataPatch: AgentBatchItem[];
  agentId: string;
  agentVersion: string;
  hashType: string;
  platform: string;
  platformVersion?: string;
}
