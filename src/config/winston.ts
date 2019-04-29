import * as winston from 'winston';
import * as path from 'path';

const winstonFileTrans = {
  filename: path.resolve(__dirname, '../../logs/all-logs.log'),
  level: 'info',
  handleExceptions: true,
  json: true,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  colorize: false,
};

const winstonConsoleTrans = {
  level: 'debug',
  handleExceptions: true,
  json: false,
  colorize: true,
};

export const winstonConfig = {
  transports: [
    new winston.transports.File(winstonFileTrans),
    new winston.transports.Console(winstonConsoleTrans),
  ],
  meta: true,
  colorize: true,
  exitOnError: false,
};
