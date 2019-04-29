import {AgentData} from './agentData';
import {TimelineItemBase} from './timelineItemBase';
import {TrackedUserBase} from './trackedUserBase';

export interface ContextArgs {
  user?: TrackedUserBase;
  tags?: string[];
  stage?: string;
  timeline: TimelineItemBase[];
  shortTitle: string;
  longTitle: string;
  hash: string;
  djatyReqId?: string;
  isTimelineTrimmed?: boolean;
  trimmedItems?: TimelineItemBase[];
  beforeSubmissionContextHandlerList?: ((data: AgentData, next: (data: AgentData) => void)
    => void)[];
  customDataContextList?: any[];
}
