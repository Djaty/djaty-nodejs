import { TimelineItemBase } from './timelineItemBase';
import { TimelineItemTypes } from './timelineItemTypes';
export interface TrimmingTimelineItem extends TimelineItemBase {
    itemType: TimelineItemTypes.TRIMMING;
}
