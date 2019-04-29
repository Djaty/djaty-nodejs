/// <reference types="node" />
export interface ServerConfig {
    hostname: string;
    port?: number;
    api: string;
    secure: boolean;
    ca?: Buffer;
}
