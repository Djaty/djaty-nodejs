"use strict";
/**
 * Problem is that the active domain context is lost inside promise then and catch.
 *
 * Example:
 * ```javascript=
 * const domain = require('domain');
 * const d1 = domain.create();
 * d1.name = 'd1';
 *
 * d1.bind(() => {
 *    new Promise((r) => {
 *        console.log(domain.active.name); // d1
 *        r();
 *    }).then(() => {
 *        // We expect that this callback is implicitly bound to the active domain context. But...
 *        console.log(domain.active); // undefined!
 *    });
 * }).call();
 * ```
 *
 * This bug is reported on [NodeJs repo](https://github.com/nodejs/node-v0.x-archive/issues/8648)
 * and still in a development state. (20-9-2017)
 *
 * So, The workaround is to wrap Promise constructor, then and catch and binding their callbacks
 * explicitly.
 *
 * NOTE: This workaround works only if the Promise is being instantiated inside an active domain
 * context just like the example above.
 *
 * For more information: https://gitlab.com/djaty/djaty-nodejs-agent/wikis/domains-and-promises
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line no-require-imports
const domain = require('domain');
exports.PromiseConstructor = global.Promise;
class PatchedPromise extends exports.PromiseConstructor {
    constructor(executor) {
        const activeDomain = domain.active;
        executor = activeDomain ? activeDomain.bind(executor) : executor;
        // call native Promise constructor
        super(executor);
        const then = this.then;
        this.then = function (onFulfilled, onRejected) {
            if (activeDomain) {
                onFulfilled = onFulfilled && activeDomain.bind(onFulfilled);
                onRejected = onRejected && activeDomain.bind(onRejected);
            }
            return then.call(this, onFulfilled, onRejected);
        };
        const catchy = this['catch'];
        this['catch'] = function (onRejected) {
            if (activeDomain) {
                onRejected = onRejected && activeDomain.bind(onRejected);
            }
            return catchy.call(this, onRejected);
        };
    }
}
exports.PatchedPromise = PatchedPromise;
//# sourceMappingURL=domainPromiseWrapper.js.map