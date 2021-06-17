import { RequestError } from '../utils';
import { SubmissionAcknowledge } from '../consts/submissionAcknowledge';
export interface ProcessCallback {
    (err?: Error | RequestError | undefined, acknowledge?: SubmissionAcknowledge): void;
}
