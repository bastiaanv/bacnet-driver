export interface NotificationEvent {
    processNumber: number;
    device: BACnetObject;
    object: BACnetObject;
    date: Date;
    notificationClass: number;
    priority: number;
    eventType: number;
    notificationType: number;
    fromState: number;
    toState: number;
}

interface BACnetObject {
    instance: number;
    type: number;
}
