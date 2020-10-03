export interface COVEvent {
    processId: number;
    device: {
        instance: number;
        type: number
    };
    monitoredObject: {
        instance: number;
        type: number
    };
    timeRemaining: number;
    cov: Array<{propertyType: number, value: any}>
}
