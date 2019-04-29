export interface DjatyStackFrame {
    filename: string;
    lineno: number;
    colno: number;
    'function': string;
    inApp?: boolean;
    module?: string;
    preContext?: string[];
    contextLine?: string;
    postContext?: string[];
}
