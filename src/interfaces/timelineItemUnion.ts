import {ConsoleTimelineItem} from './consoleTimelineItem';
import {ExceptionTimelineItem} from './exceptionTimelineItem';
import {HttpTimelineItem} from './httpTimelineItem';
import {TrimmingTimelineItem} from './trimmingTimelineItem';

export type TimelineItemUnion = ConsoleTimelineItem | ExceptionTimelineItem |
  HttpTimelineItem | TrimmingTimelineItem;
