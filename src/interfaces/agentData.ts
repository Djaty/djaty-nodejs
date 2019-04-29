import {AgentBatchItem} from './agentBatchItem';

export interface AgentData {
  agentDataPatch: AgentBatchItem[];
  agentId: string;
  agentVersion: string;
  apiKey: string;
  apiSecret: string;
  hashType: 'sha256';
  platform: string;
  platformVersion?: string;

  // Only include release information if it is set
  release?: string;

  serverLocalIp: string;
  serverName: string;
  stage?: string;
  tags?: string[];
}
