"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
const path = require("path");
const winstonFileTrans = {
    filename: path.resolve(__dirname, '../../logs/all-logs.log'),
    level: 'info',
    handleExceptions: true,
    json: true,
    maxsize: 5242880,
    maxFiles: 5,
    colorize: false,
};
const winstonConsoleTrans = {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
};
exports.winstonConfig = {
    transports: [
        new winston.transports.File(winstonFileTrans),
        new winston.transports.Console(winstonConsoleTrans),
    ],
    meta: true,
    colorize: true,
    exitOnError: false,
};
//# sourceMappingURL=winston.js.map