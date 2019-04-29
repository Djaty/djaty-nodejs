import { TrackedUser } from './trackedUser';
import { TimelineItemBase } from './timelineItemBase';
export interface AgentBatchItem {
    bugType: string;
    customData?: any[];
    djatyReqId?: string;
    hash: string;
    isTemp: boolean;
    longTitle: string;
    shortTitle: string;
    timeline: TimelineItemBase[];
    user?: TrackedUser;
}
