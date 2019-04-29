export interface TrackingWrappers {
    console: Function;
    http: Function;
    [prop: string]: Function;
}
