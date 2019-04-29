import {Domain} from 'domain';

import {ActiveDomain} from './activeDomain';

export interface DjatyDomain extends Domain {
  active?: ActiveDomain;
  create: Function;
  _stack: ActiveDomain[];
}
