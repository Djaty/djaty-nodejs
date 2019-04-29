import { RequestError, ProcessAcknowledge } from '../utils';
export interface ProcessCallback {
    (err?: Error | RequestError | undefined, acknowledge?: ProcessAcknowledge): void;
}
