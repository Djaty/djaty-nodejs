import { LoggerInstanceConfig } from './loggerInstanceConfig';
export interface AllowedWrappers {
    stdLogs?: boolean;
    console?: boolean;
    http?: boolean;
    customLoggers?: LoggerInstanceConfig[];
}
