import { TimelineItemBase } from './timelineItemBase';
import { TimelineItemTypes } from './timelineItemTypes';
export interface ConsoleTimelineItem extends TimelineItemBase {
    itemType: TimelineItemTypes.CONSOLE;
    method: string;
    consoleParams: any[];
    hash?: string;
}
