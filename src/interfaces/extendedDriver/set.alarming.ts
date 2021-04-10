export interface SetAlarming {
    address: string;
    deviceId: number;
    objectType: number;
    objectInstance: number;
    lowLimit: Limit;
    highLimit: Limit
}

interface Limit {
    enable: boolean;
    overwriteLimitValue?: number;
}