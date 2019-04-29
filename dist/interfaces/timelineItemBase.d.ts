import { TimelineItemTypes } from './timelineItemTypes';
export interface TimelineItemBase {
    itemType: TimelineItemTypes;
    timestamp: number;
}
