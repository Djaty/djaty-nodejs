import { OrigFn } from './interfaces/origFn';
import { DjatyInterface } from './interfaces/djatyInterface';
/**
 * Polyfill a method
 *
 * @param obj: Object e.g. `document`
 * @param name: Method name present on object e.g. `addEventListener`
 * @param replacement: Replacement function
 * @param track: Optional, record instrumentation to an array
 */
export declare function fill(obj: any, name: string, replacement: Function, track?: OrigFn[]): void;
export declare const allowedConsoleMethods: string[];
/**
 * Array of original functions
 * @type {Array}
 */
export declare const originals: OrigFn[];
export declare function instrument({key, wrapperOpts}: {
    key: string;
    wrapperOpts?: any;
}, djaty: DjatyInterface): void;
export declare function restoreOriginals(): void;
