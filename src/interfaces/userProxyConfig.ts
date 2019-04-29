export interface UserProxyConfig {
  hostname?: string;

  port?: number;

  secure?: boolean;

  // Required if `secure: true` and server `https` certificates are self-signed.
  ca?: Buffer;
}
