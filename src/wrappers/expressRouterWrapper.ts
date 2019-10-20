/**
 * This wrapper is usually used if someone uses a module to set the route handler middleware instead
 * of using the known `app.use()`. Depending on the internal implementation of the module used,
 * the active domain may be lost inside the handler.
 *
 * So, use this wrapper if:
 * - You don't use `app.use()` or router methods like `router.post()` directly AND
 * - The reported bugs have missing timeline items (A missing console.log() for example)
 */

import {DjatyDomain} from '../interfaces/djatyDomain';

// tslint:disable-next-line no-require-imports
const domain = <DjatyDomain> require('domain');

// tslint:disable-next-line no-require-imports
const expressApp = require('express/lib/application');

const orgMethod = expressApp.handle;
expressApp.handle = function (...args: any[]) {
  const activeDomain = domain.active;

  if (activeDomain && activeDomain.__name === 'reqWrapDomain') {
    return activeDomain.bind(orgMethod).apply(this, args);
  }

  const reqWrapDomain = domain.create();
  reqWrapDomain.__name = 'reqWrapDomain';

  return reqWrapDomain.bind(orgMethod).apply(this, args);
};
