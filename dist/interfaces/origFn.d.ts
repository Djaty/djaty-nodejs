import { Indexer } from './indexer';
export interface OrigFn {
    obj: Indexer<Function>;
    name: string;
    orig: Function;
}
