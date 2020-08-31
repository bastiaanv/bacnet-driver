import { WriteValue } from './write.value';

export interface WritePropertyOptions {
    address: string;
    deviceId: number;
    objectType: number;
    objectInstance: number;
    propertyId: number;
    values: WriteValue[];
}
