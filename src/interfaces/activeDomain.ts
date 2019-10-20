import {ContextArgs} from './contextArgs';

export interface ActiveDomain {
  __name: string;
  djatyContext: ContextArgs;
  add: Function;
  bind: Function;
  exit: Function;
  on: Function;
  run: Function;
  members?: any[];
}
