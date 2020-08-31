import { BacnetDriver } from './driver';
import { ReadObject } from './interfaces/events/readProperty/read.object';
import { ObjectType, PropertyIdentifier } from './enum';
import { ReadString } from './interfaces/events/readProperty/read.string';

export class BacnetDriverExtended extends BacnetDriver {
    public readObjectList(options: {address: string, deviceId: number}): Promise<ReadObject[]> {
        return this.readProperty({address: options.address, deviceId: options.deviceId, objectType: ObjectType.DEVICE, objectInstance: options.deviceId, propertyId: PropertyIdentifier.OBJECT_LIST});
    }

    public readPresentValue(address: string, deviceId: number, objectType: number, objectInstance: number): Promise<ReadString> {
        return this.readProperty({address, deviceId, objectType, objectInstance, propertyId: PropertyIdentifier.PRESENT_VALUE});
    }
}
