import { BacnetDriver } from './driver';
import { ReadObject } from './interfaces/events/readProperty/read.object';
import { ObjectType, PropertyIdentifier } from './enum';
import { ReadString } from './interfaces/events/readProperty/read.string';

export class BacnetDriverExtended extends BacnetDriver {
    public readObjectList(address: string, deviceId: number): Promise<ReadObject[]> {
        return this.readProperty(address, deviceId, ObjectType.DEVICE, deviceId, PropertyIdentifier.OBJECT_LIST);
    }

    public readPresentValue(address: string, deviceId: number, objectType: number, objectInstance: number): Promise<ReadString> {
        return this.readProperty(address, deviceId, objectType, objectInstance, PropertyIdentifier.PRESENT_VALUE);
    }
}