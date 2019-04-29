import * as winston from 'winston';
export declare const winstonConfig: {
    transports: (winston.transports.ConsoleTransportInstance | winston.transports.FileTransportInstance)[];
    meta: boolean;
    colorize: boolean;
    exitOnError: boolean;
};
