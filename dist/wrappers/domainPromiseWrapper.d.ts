export interface ConstructorI extends Promise<any> {
    new (executor: Function): ConstructorI;
}
export declare const PromiseConstructor: ConstructorI;
export declare class PatchedPromise extends PromiseConstructor {
    constructor(executor: Function);
}
