import {EventEmitter} from 'events';
import * as Express from 'express';

import * as utils from '../utils';
import {MergedConfigOptions} from './mergedConfigOptions';
import {UserConfigOptions} from './userConfigOptions';
import {TrackedUserBase} from './trackedUserBase';
import {ActiveDomain} from './activeDomain';
import {TimelineItemUnion} from './timelineItemUnion';
import {AgentData} from './agentData';

export interface DjatyInterface extends EventEmitter {
  isInitiated: boolean;
  version: string;

  init(options?: UserConfigOptions): this;
  destroy(): this;
  getOptions(): MergedConfigOptions;
  requestHandler(): (req: Express.Request, res: Express.Response, next: Function) => void;
  errorHandler(): (err: utils.RequestError, req: Express.Request, res: Express.Response,
                   next: Function) => void;

  trackBug(bug: Error | string): Promise<{}>;
  setUser({userId, logon}: TrackedUserBase): void;
  getDjatyHostName(): string | undefined;
  trackTimelineItem(activeDomain: ActiveDomain | undefined,
                    timelineItem: TimelineItemUnion): void;

  addBeforeSubmissionHandler(cb: (data: AgentData,
                                  next: (data: AgentData) => void) => void): void;

  addBeforeSubmissionContextHandler(cb: (data: AgentData,
                                         next: (data: AgentData) => void) => void): void;

  addGlobalCustomData(data: any): void;
  addContextCustomData(data: any): void;
}
