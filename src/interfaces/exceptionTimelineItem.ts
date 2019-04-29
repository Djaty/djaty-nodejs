import {TimelineItemBase} from './timelineItemBase';
import {TimelineItemTypes} from './timelineItemTypes';

export interface ExceptionTimelineItem extends TimelineItemBase {
  itemType: TimelineItemTypes.EXCEPTION;
  stringifiedStack: string;
  type: string;
  msg: string;
  hash: string;
}
