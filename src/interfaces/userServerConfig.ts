import {UserProxyConfig} from './userProxyConfig';

export interface UserServerConfig extends UserProxyConfig {
  // hostname, inherited, Default: 'djaty.com'
  // secure, inherited, Default: true
  // port, inherited, Default: 443

  // Default: '/api'
  apiPath?: string;
}
