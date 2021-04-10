import { BacnetDriver } from './driver';
import { ReadObject } from './interfaces/events/readProperty/read.object';
import { ApplicationTags, ObjectType, PropertyIdentifier } from './enum';
import { SetAlarming } from './interfaces/extendedDriver/set.alarming';
import { ActivateNotificationClass } from './interfaces/extendedDriver/activate.notification.class';
import { ReadNumber } from './interfaces';

export class BacnetDriverExtended extends BacnetDriver {
    public readObjectList(options: {address: string, deviceId: number}): Promise<ReadObject[]> {
        return this.readProperty({
            address: options.address,
            deviceId: options.deviceId,
            objectType: ObjectType.DEVICE,
            objectInstance: options.deviceId,
            propertyId: PropertyIdentifier.OBJECT_LIST
        });
    }

    public readPresentValue(options: {address: string, deviceId: number, objectType: number, objectInstance: number}): Promise<ReadNumber> {
        return this.readProperty({
            address: options.address,
            deviceId: options.deviceId,
            objectType: options.objectType,
            objectInstance: options.objectInstance,
            propertyId: PropertyIdentifier.PRESENT_VALUE
        });
    }

    public async activateNotificationClasses(options: ActivateNotificationClass): Promise<void> {
        if ((options.ipAddress.match(/\./g) || []).length !== 3) {
            throw new Error('Invalid ip address given...');
        }

        const ip: number[] = [];
        for (const part of options.ipAddress.split('.')) {
            ip.push(parseInt(part));
        }

        let port: number[] = [];
        if (options.port) {
            const hex = options.port.toString(16);
            for (let i = 0; i < hex.length; i+=2) {
                port.push(parseInt(hex[i] + hex[i+1]));
            }

        } else {
            port = [0xBA, 0xC0];
        }

        const transitions: boolean[] = options.transitions ? 
            [options.transitions.toOffNormal, options.transitions.toFault, options.transitions.toNormal] :
            [true, true, true];

        const fromTime: Date = options.fromTime ? options.fromTime : new Date(0, 0, 0, 0,0, 0, 0);
        const toTime: Date = options.toTime ? options.toTime : new Date(0, 0, 0, 23, 59, 59, 0);

        const days: boolean[] = options.days ? 
            [options.days.monday, options.days.tuesday, options.days.wednesday, options.days.thursday, options.days.friday, options.days.saturday, options.days.sunday] :
            [true, true, true, true, true, true, true];

        const promises: Promise<void>[] = [];
        for (const instance of options.objectInstances) {
            promises.push(
                this.writeProperty({
                    address: options.address,
                    deviceId: options.deviceId,
                    objectType: ObjectType.NOTIFICATION_CLASS,
                    objectInstance: instance,
                    propertyId: PropertyIdentifier.RECIPIENT_LIST,
                    values: [
                        // Valid days: Every day -> Starting monday
                        {
                            type: ApplicationTags.BIT_STRING,
                            value: days,
                        },
                        // From time: 00:00:00.000
                        {
                            type: ApplicationTags.TIME,
                            value: fromTime,
                        },
                        // To time: 23:59:59.0
                        {
                            type: ApplicationTags.TIME,
                            value: toTime,
                        },
                        // Opening tag: Tag number -> 1
                        {
                            type: ApplicationTags.OPENING_TAG,
                            value: 1,
                        },
                            // Network number: 0
                            {
                                type: ApplicationTags.UNSIGNED_INTEGER,
                                value: 0
                            },
                            // Mac address: IP address + port
                            {
                                type: ApplicationTags.OCTET_STRING,
                                value: [...ip, ...port],
                            },
                        // Closing tag: Tag number -> 1
                        {
                            type: ApplicationTags.CLOSING_TAG,
                            value: 1,
                        },
                        // Process Identifier
                        {
                            type: ApplicationTags.UNSIGNED_INTEGER,
                            value: this.getProcessId(),
                        },
                        // Issue Confirmed notifications
                        {
                            type: ApplicationTags.BOOLEAN,
                            value: false,
                        },
                        // Transitions: To offnormal, To fault, To normal
                        {
                            type: ApplicationTags.BIT_STRING,
                            value: transitions,
                        },
                    ]
                })
            );
        }

        await Promise.all(promises);
    }

    public async setAlarming(options: SetAlarming): Promise<void> {
        const bacnetObject = {
            address: options.address,
            deviceId: options.deviceId,
            objectType: options.objectType,
            objectInstance: options.objectInstance
        };

        await this.writeProperty({
            ...bacnetObject,
            propertyId: PropertyIdentifier.LIMIT_ENABLE,
            values: [
                {
                    type: ApplicationTags.BIT_STRING,
                    value: [options.lowLimit.enable, options.highLimit.enable],
                },
            ]
        });

        if (options.lowLimit.overwriteLimitValue) {
            await this.writeProperty({
                ...bacnetObject,
                propertyId: PropertyIdentifier.LOW_LIMIT,
                values: [
                    {
                        type: ApplicationTags.DOUBLE,
                        value: options.lowLimit.overwriteLimitValue,
                    }
                ]
            });
        }

        if (options.highLimit.overwriteLimitValue) {
            await this.writeProperty({
                ...bacnetObject,
                propertyId: PropertyIdentifier.HIGH_LIMIT,
                values: [
                    {
                        type: ApplicationTags.DOUBLE,
                        value: options.highLimit.overwriteLimitValue,
                    }
                ]
            });
        }
    }
}
