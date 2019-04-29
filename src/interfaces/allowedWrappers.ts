import {LoggerInstanceConfig} from './loggerInstanceConfig';

export interface AllowedWrappers {
  // To track both `stdout` and `stderr` logs.
  stdLogs?: boolean;

  // To track console logs.
  console?: boolean;

  // To track outcome `http` requests.
  http?: boolean;

  // To track other loggers like `winston` logs. This object accepts the logger name as a property
  // name and the value is an object.
  customLoggers?: LoggerInstanceConfig[];
}
