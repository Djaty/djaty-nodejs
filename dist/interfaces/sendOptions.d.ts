import { UserProxyConfig } from './userProxyConfig';
import { UserServerConfig } from './userServerConfig';
export interface SendOptions {
    server: UserServerConfig;
    proxy?: UserProxyConfig;
}
