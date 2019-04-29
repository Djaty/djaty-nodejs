import * as _ from 'lodash';

import {AllowedCustomLoggers} from './customLogger/allowedCustomLoggers';
import {DefaultStages, TAGS_LIMIT} from './config/validationDefaults';

export const userConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiKey: {
      type: 'string',
    },
    apiSecret: {
      type: 'string',
    },
    djatyIsTracking: {
      type: 'boolean',
    },
    addGlobalCustomData: {
      'instanceof': 'Function',
    },
    allowAutoSubmission: {
      type: 'boolean',
    },
    exitOnUncaughtExceptions: {
      type: 'boolean',
    },
    reportDjatyCrashes: {
      type: 'boolean',
    },
    onBeforeBugSubmission: {
      'instanceof': 'Function',
    },
    proxy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ca: {
          'instanceof': 'Buffer',
        },
        hostname: {
          type: 'string',
          format: 'hostname',
        },
        port: {
          type: 'integer',
          minimum: 1,
          maximum: 65535,
        },
        secure: {
          type: 'boolean',
        },
      },
    },
    release: {
      type: 'string',
      maxLength: 100,
      minLength: 1,
    },
    server: {
      type: 'object',
      additionalProperties: false,
      properties: {
        apiPath: {
          type: 'string',
        },
        ca: {
          'instanceof': 'Buffer',
        },
        hostname: {
          type: 'string',
          format: 'hostname',
        },
        port: {
          type: 'integer',
          minimum: 1,
          maximum: 65535,
        },
        secure: {
          type: 'boolean',
        },
      },
    },
    showDjatyLogs: {
      type: 'boolean',
    },
    stage: {
      type: 'string',
      maxLength: 45,
      minLength: 1,
      'enum': _.values(DefaultStages),
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 45,
        minLength: 1,
      },
      maxItems: TAGS_LIMIT,
      uniqueItems: true,
    },
    trackingOptions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        allowedWrappers: {
          anyOf: [{
            type: 'object',
            additionalProperties: false,
            properties: {
              console: {
                type: 'boolean',
              },
              customLoggers: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: {
                      'enum': [AllowedCustomLoggers.winston],
                    },
                  },
                  required: ['name'],
                },
              },
              http: {
                type: 'boolean',
              },
              stdLogs: {
                type: 'boolean',
              },
            },
          },
          {
            type: 'boolean',
          }],
        },
        captureUnhandledRejections: {
          type: 'boolean',
        },
        parseUser: {
          anyOf: [{
            'instanceof': 'Function',
          },
          {
            type: 'boolean',
          }],
        },
        stacktraceLimit: {
          type: 'integer',
        },
        timelineLimit: {
          type: 'integer',
        },
      },
    },

    // A flag is used only for testing so don't expose in the options interface.
    disableDjatyDomainErrors: {
      type: 'boolean',
    },
  },
  required: ['apiKey', 'apiSecret'],
};
