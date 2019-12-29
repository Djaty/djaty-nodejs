"use strict";
/**
 * This wrapper is usually used if someone uses a module to set the route handler middleware instead
 * of using the known `app.use()`. Depending on the internal implementation of the module used,
 * the active domain may be lost inside the handler.
 *
 * So, use this wrapper if:
 * - You don't use `app.use()` or router methods like `router.post()` directly AND
 * - The reported bugs have missing timeline items (A missing console.log() for example)
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line no-require-imports
const domain = require('domain');
// tslint:disable-next-line no-require-imports
const expressApp = require('express/lib/application');
const orgMethod = expressApp.handle;
expressApp.handle = function (...args) {
    const activeDomain = domain.active;
    if (activeDomain && activeDomain.__name === 'djatyReqWrapDomain') {
        return activeDomain.bind(orgMethod).apply(this, args);
    }
    const djatyReqWrapDomain = domain.create();
    djatyReqWrapDomain.__name = 'djatyReqWrapDomain';
    return djatyReqWrapDomain.bind(orgMethod).apply(this, args);
};
//# sourceMappingURL=expressRouterWrapper.js.map