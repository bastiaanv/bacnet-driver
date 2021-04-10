export interface ActivateNotificationClass {
    address: string;
    deviceId: number;
    objectInstances: number[];
    ipAddress: string;
    port?: number;

    /** Determines transition. Defaults -> toNormal: true, toOffNormal: true, toFault: true */
    transitions?: {
        toNormal: boolean;
        toOffNormal: boolean;
        toFault: boolean;
    },

    /** Default: 00:00:00.000, NOTE: Year, Month, Date of this property are ignored */
    fromTime?: Date;

    /** Default: 23:59:59.000, NOTE: Year, Month, Date of this property are ignored */
    toTime?: Date;

    /** Default: All days -> true */
    days?: {
        monday: boolean;
        tuesday: boolean;
        wednesday: boolean;
        thursday: boolean;
        friday: boolean;
        saturday: boolean;
        sunday: boolean;
    };
}