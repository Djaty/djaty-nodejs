import {TimelineItemBase} from './timelineItemBase';
import {TimelineItemTypes} from './timelineItemTypes';

export interface HttpTimelineItem extends TimelineItemBase {
  itemType: TimelineItemTypes.HTTP_REQ;
  method: string;
  queryParams?: {
    [k: string]: any;
  }[];
  url: string;
  status?: number;
  statusText?: string;
  requestTime?: number;
  djatyReqId?: string;
  remoteAddr?: string;
}
