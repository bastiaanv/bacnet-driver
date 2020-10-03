export interface COVOptions {
    address: string;
    deviceId: number;
    monitoredObject: {
        instance: number;
        type: number;
    };
    processId?: number;
    cancellable?: {
        issueConfirmedNotifications: boolean;
        lifetime: number;
    };
}