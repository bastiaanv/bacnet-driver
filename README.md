# Bacnet-driver

A BACnet protocol stack written in pure typescript with RXJS and promises. BACnet is a protocol to interact with building automation devices defined by ASHRAE. Big shout out to FH1CH for making the [node-bacstack library](https://github.com/fh1ch/node-bacstack). A lot of priniciples there, are used here.

<p align="center">
<a href="https://github.com/bastiaanv/bacnet-driver/actions?query=workflow%3A%22Build+npm+package%22"><img src="https://github.com/bastiaanv/bacnet-driver/workflows/Build%20npm%20package/badge.svg"/></a>
</p>

## Table of Contents

- [Usage](#Usage)
- [Features](#Features)
- [API Basic](#API--Basic)
  - [Who Is](#Who-Is)
  - [Read property](#Read-Property)
  - [Write property](#Write-Property)
  - [Subscribe COV](#Subscribe-COV)
- [API Extended](#API---Extended)
  - [Read Object List](#Read-Object-List)
  - [Read Present Value](#Read-Present-Value)
  - [Activate Notification Class](#Activate-Notification-Class)
  - [Set Alarming](#Set-Alarming)
- [Events](#Events)
  - [I Am Subject](#I-Am-Subject)
  - [Cov Subject](#Cov-Subject)
  - [Alarm Subject](#Alarm-Subject)
  - [Error Subject](#Error-Subject)
- [License](#License)

## Usage

Add Bacnet-driver to your project by:

1. Login to the Github Packages registry:

```bash
npm login --registry=https://npm.pkg.github.com
```

2. Adding the .npmrc file:

```
registry=https://npm.pkg.github.com/bastiaanv
```

3. Running the following npm command:

```bash
npm i @bastiaanv/bacnet-driver
```

## Features

**NOTE** this library is still in pre-alpa and is not recommended in poduction usages. For those case, please use the [node-bacstack library](https://github.com/fh1ch/node-bacstack).

| Service       | Receive | execute |
| ------------- | ------- | ------- |
| whoIs         | No      | Yes     |
| iAm           | Yes     | No      |
| readProperty  | No      | Partly  |
| writeProperty | No      | Partly  |
| readMultiple  | No      | No      |
| writeMultiple | No      | No      |
| Subscribe COV | No      | Yes     |

readProperty: This service can only read unsigned integers, floats, booleans, strings and ObjectIndentifiers

writeProperty: Unsupported types: TIMESTAMP, OCTET_STRING, OBJECTIDENTIFIER, COV_SUBSCRIPTION, READ_ACCESS_RESULT, READ_ACCESS_SPECIFICATION

## API - Basic

### Who Is

The whoIs command discovers all BACNET devices in a network. BACNET devices who has received this command will sent a [IAm command](#I-Am-Subject).

#### Example

```js
import { BacnetDriver } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriver({});
bacnetDriver.whoIs();
```

#### Parameters

| Name    | Type    | Description                                                                              |
| ------- | ------- | ---------------------------------------------------------------------------------------- |
| address | string? | An optional parameter to which send the WhoIs command directly, instead of broadcasting. |

#### Returns

| Name       | Type | Description                               |
| ---------- | ---- | ----------------------------------------- |
| `response` | void | Can trigger [IAm commands](#I-Am-Subject) |

### Read Property

The readProperty command reads a single property of an object from a device.
Note, the device should have been found first via the [WhoIs command](#Who-Is) before the read property command can be used.

#### Example

```js
import { BacnetDriver, ObjectType, PropertyIdentifier } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver
  .readProperty({
    address: '192.168.1.2',
    deviceId: 2000,
    objectType: ObjectType.ANALOG_INPUT,
    objectInstance: 1,
    propertyId: PropertyIdentifier.PRESENT_VALUE,
  })
  .then(console.log);
```

#### Parameters - `ReadPropertyOptions`

| Name                     | Type   | Description                                                                                                        |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `options`                | object |                                                                                                                    |
| `options.address`        | string | IP address of the target device.                                                                                   |
| `options.deviceId`       | number | The device ID of the target device.                                                                                |
| `options.objectType`     | number | The object ID to read. The `ObjectType` could be used from the bacnetDriver enum.                                  |
| `options.objectInstance` | number | The object instance to read.                                                                                       |
| `options.propertyId`     | number | The property ID in the specified object to read.The `PropertyIdentifier` could be used from the bacnetDriver enum. |

#### Returns

The returned value depens on the propertyID you have read. This is why the this method returns the `Promise<any>`. But when you you the [BacnetDriverExtended](#API---Extended) you can use the predefined methods and will get the correct return type.
| Name | Type | Description |
|------------|-------------------------------------------------------------------------------------------|-------------|
| `response` | Promise\<any\> \| Promise\<ReadString\> \| Promise\<ReadNumber\> \| Promise\<ReadObject\> | |

### Write Property

The writeProperty command writes a single property of an object to a device.
Please note, that the following `ApplicationTags` are not supported (yet): TIMESTAMP, OBJECTIDENTIFIER, COV_SUBSCRIPTION, READ_ACCESS_RESULT, READ_ACCESS_SPECIFICATION.
Also, the device should have been found first via the [WhoIs command](#Who-Is) before the write property command can be used.

#### Example

```js
import { BacnetDriver, ObjectType, PropertyIdentifier, ApplicationTags } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver
  .writeProperty({
    address: '192.168.1.2',
    deviceId: 2000,
    objectType: ObjectType.ANALOG_INPUT,
    objectInstance: 1,
    propertyId: PropertyIdentifier.OUT_OF_SERVICE,
    values: [{ type: ApplicationTags.BOOLEAN, value: true }],
  })
  .then(console.log);
```

#### Parameters - `WritePropertyOptions`

| Name                     | Type   | Description                                                                                                        |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `options`                | object |                                                                                                                    |
| `options.address`        | string | IP address of the target device.                                                                                   |
| `options.deviceId`       | number | The device ID of the target device.                                                                                |
| `options.objectType`     | number | The object ID to read. The `ObjectType` could be used from the bacnetDriver enum.                                  |
| `options.objectInstance` | number | The object instance to read.                                                                                       |
| `options.propertyId`     | number | The property ID in the specified object to read.The `PropertyIdentifier` could be used from the bacnetDriver enum. |
| `options.values`         | array  |                                                                                                                    |
| `options.values.type`    | number | The data-type of the value to be written. The `ApplicationTags` could be used from the bacnetDriver enum.          |
| `options.values.value`   | any    | The actual value to be written.                                                                                    |

#### Returns

| Name       | Type            | Description |
| ---------- | --------------- | ----------- |
| `response` | Promise\<void\> |             |

### Subscribe COV

The Subscribe COV command subscribes your application to a specific object in the BACNET device.
If a value in the object changes, a [covObservable](#Cov-Subject) will be fired.
Note, the device should have been found first via the [WhoIs command](#Who-Is) before the subscribe COV command can be used.

#### Example

```js
import { BacnetDriver, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver
  .subscribeCov({
    address: '192.168.1.2',
    deviceId: 2000,
    monitoredObject: { type: ObjectType.ANALOG_INPUT, instance: 8 },
    cancellable: { issueConfirmedNotifications: false, lifetime: 120 },
  })
  .then(console.log);
```

#### Parameters - `COVOptions`

| Name                                              | Type    | Description                                                                       |
| ------------------------------------------------- | ------- | --------------------------------------------------------------------------------- |
| `options`                                         | object  |                                                                                   |
| `options.address`                                 | string  | IP address of the target device.                                                  |
| `options.deviceId`                                | number  | The device ID of the target device.                                               |
| `options.monitoredObject`                         | object  |                                                                                   |
| `options.monitoredObject.type`                    | number  | The object ID to read. The `ObjectType` could be used from the bacnetDriver enum. |
| `options.monitoredObject.instance`                | number  | The object instance to read.                                                      |
| `options.processId`                               | number? | The process ID to use. When not given, the bacnet driver will generate one.       |
| `options.cancellable`                             | object? | Optional                                                                          |
| `options.cancellable.issueConfirmedNotifications` | boolean | Determines is the subscription should use confirmed or unconfirmed notifications  |
| `options.cancellable.lifetime`                    | number  | The lifetime of the subscription                                                  |

#### Returns

| Name       | Type            | Description |
| ---------- | --------------- | ----------- |
| `response` | Promise\<void\> |             |

## API - Extended

The BacnetDriverExtended has predefined BACNET methods for you to use, like: `readObjectList` or `readPresentValue`. Each of these methods make use of the `readProperty` or `writeProperty` method.

### Read Object List

The readObjectList command reads the object list of a BACNET device.

#### Example

```js
import { BacnetDriverExtended, ObjectType, PropertyIdentifier } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriverExtended({});
bacnetDriver
  .readObjectList({
    address: '192.168.1.2',
    deviceId: 2000,
  })
  .then(console.log);
```

#### Parameters

| Name               | Type   | Description                         |
| ------------------ | ------ | ----------------------------------- |
| `options`          | object |                                     |
| `options.address`  | string | IP address of the target device.    |
| `options.deviceId` | number | The device ID of the target device. |

#### Returns

| Name       | Type                  | Description |
| ---------- | --------------------- | ----------- |
| `response` | Promise<ReadObject[]> |             |

### Read Present Value

The readPresentValue command reads the object list of a BACNET device.

#### Example

```js
import { BacnetDriverExtended, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriverExtended({});
bacnetDriver
  .readPresentValue({
    address: '192.168.1.2',
    deviceId: 2000,
    objectType: ObjectType.ANALOG_INPUT,
    objectInstance: 100,
  })
  .then(console.log);
```

#### Parameters

| Name                     | Type   | Description                                                                       |
| ------------------------ | ------ | --------------------------------------------------------------------------------- |
| `options`                | object |                                                                                   |
| `options.address`        | string | IP address of the target device.                                                  |
| `options.deviceId`       | number | The device ID of the target device.                                               |
| `options.objectType`     | number | The object ID to read. The `ObjectType` could be used from the bacnetDriver enum. |
| `options.objectInstance` | number | The object instance to read.                                                      |

#### Returns

| Name       | Type                | Description |
| ---------- | ------------------- | ----------- |
| `response` | Promise<ReadNumber> |             |

### Activate Notification Class

The activateNotificationClass command subscribes your application to limit alarms. This functions should be combined [setAlarming](#Set-Alarming) with the corresponding BACnet objects.

#### Example

```js
import { BacnetDriverExtended, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriverExtended({});
bacnet
  .activateNotificationClasses({
    address: '192.168.0.1',
    deviceId: 1,
    objectInstances: [100, 101, 102],
    ipAddress: '192.168.0.254',
  })
  .then(() => {
    /* REST OF CODE */
  });
```

#### Parameters - ActivateNotificationClass

| Name                             | Type     | Description                                                                                                  |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `options`                        | object   |                                                                                                              |
| `options.address`                | string   | IP address of the target device.                                                                             |
| `options.deviceId`               | number   | The device ID of the target device.                                                                          |
| `options.objectInstances`        | number[] | The notification classes that should be activated.                                                           |
| `options.ipAddress`              | string   | The IP address of this devices's BACnet interface                                                            |
| `options.port`                   | number?  | The port of this device's BACnet interface. Default: 0xBAC0                                                  |
| `options.fromTime`               | Date?    | The start date from which to recieve alarm notifications. Default: 00:00:00.000                              |
| `options.toTime`                 | Date?    | The end date from which to recieve alarm notifications. Default: 23:59:59.000                                |
| `options.transition`             | object?  |                                                                                                              |
| `options.transition.toNormal`    | boolean  | Determines whether to recieve an alarm notification when the state changes to Normal state. Default: true    |
| `options.transition.toOffNormal` | boolean  | Determines whether to recieve an alarm notification when the state changes to OffNormal state. Default: true |
| `options.transition.toFault`     | boolean  | Determines whether to recieve an alarm notification when the state changes to Fault state. Default: true     |
| `options.days`                   | object?  |                                                                                                              |
| `options.days.monday`            | boolean  | Determines whether to recieve an alarm notification on Mondays. Default: true                                |
| `options.days.tuesday`           | boolean  | Determines whether to recieve an alarm notification on Tuesdays. Default: true                               |
| `options.days.wednesday`         | boolean  | Determines whether to recieve an alarm notification on Wednesdays. Default: true                             |
| `options.days.thursday`          | boolean  | Determines whether to recieve an alarm notification on Thursdays. Default: true                              |
| `options.days.friday`            | boolean  | Determines whether to recieve an alarm notification on Fridays. Default: true                                |
| `options.days.saturday`          | boolean  | Determines whether to recieve an alarm notification on Saturdays. Default: true                              |
| `options.days.sunday`            | boolean  | Determines whether to recieve an alarm notification on Sundays. Default: true                                |

#### Returns

| Name       | Type          | Description                                                                                        |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `response` | Promise<void> | Combined with [an active limit object](#Set-Alarming) can trigger an [Alarm event](#Alarm-Subject) |

### Set Alarming

The setAlarming command subscribes your application to limit alarms. This functions should be combined [activateNotificationClass](#Activate-Notification-Class) with the corresponding BACnet notification classes.

#### Example

```js
import { BacnetDriverExtended, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriverExtended({});
bacnet.setAlarming({
    address: '192.168.0.1',
    deviceId: 1,
    objectType: ObjectType.ANALOG_INPUT
    objectInstance: 1,
    lowlimit: { enable: true, overwriteLimitValue: 0 },
    highlimit: { enable: true, overwriteLimitValue: 100 },
}).then(() => { /* REST OF CODE */ });
```

#### Parameters - SetAlarming

| Name                                    | Type    | Description                                                                       |
| --------------------------------------- | ------- | --------------------------------------------------------------------------------- |
| `options`                               | object  |                                                                                   |
| `options.address`                       | string  | IP address of the target device.                                                  |
| `options.deviceId`                      | number  | The device ID of the target device.                                               |
| `options.objectType`                    | number  | The object ID to read. The `ObjectType` could be used from the bacnetDriver enum. |
| `options.objectInstance`                | number  | The object instance to read.                                                      |
| `options.lowLimit`                      | object  |                                                                                   |
| `options.lowLimit.enable`               | boolean | Enables or disables low limit alarming                                            |
| `options.lowLimit.overwriteLimitValue`  | number? | Optional parameter to overwrite the current low limit alarming value.             |
| `options.highLimit`                     | object  |                                                                                   |
| `options.highLimit.enable`              | boolean | Enables or disables hihg limit alarming                                           |
| `options.highLimit.overwriteLimitValue` | number? | Optional parameter to overwrite the current low high alarming value.              |

#### Returns

| Name       | Type          | Description                                                                                                                |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `response` | Promise<void> | Combined with [an activated notification class](#Activate-Notification-Class) can trigger an [Alarm event](#Alarm-Subject) |

## Events

This library makes use of [RXJS](https://rxjs-dev.firebaseapp.com/guide/overview) library for event handling.

### I Am Subject

This subject will fire, when a devices react to the [WhoIs command](#Who-Is) over the network or when a BACNET device has booted.

#### Example

```js
import { BacnetDriver } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriver({});
bacnetDrive.iAmObservable.subscribe(console.log);
bacnetDriver.whoIs();
```

#### Returns - `IAmEvent`

| Name                | Type   | Description                         |
| ------------------- | ------ | ----------------------------------- |
| `response`          | object |                                     |
| `response.address`  | string | IP address of the target device.    |
| `response.deviceId` | number | The device ID of the target device. |

### Cov Subject

This subject will fire, when a object in the BACNET device has been changed and the Bacnet driver has a active subscription, see more (Subscribe Cov)[#Subscribe-Cov].

#### Example

```js
import { BacnetDriver, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver.covObservable.subscribe(console.log);
bacnetDriver
  .subscribeCov({
    address: '192.168.1.2',
    deviceId: 2000,
    monitoredObject: { type: ObjectType.ANALOG_INPUT, instance: 8 },
    cancellable: { issueConfirmedNotifications: false, lifetime: 120 },
  })
  .then(console.log);
```

#### Returns - `COVEvent`

| Name                                | Type   | Description                                                                                                  |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `response`                          | object |                                                                                                              |
| `response.processId`                | number | The process id used for this subscription.                                                                   |
| `response.device`                   | object |                                                                                                              |
| `response.device.instance`          | number | The instance of the target device.                                                                           |
| `response.device.type`              | number | The object ID of the target device. NOTE: this value will always be 8, since it is given by the BACNET specs |
| `response.monitoredObject`          | object |                                                                                                              |
| `response.monitoredObject.type`     | number | The object type of the changed object                                                                        |
| `response.monitoredObject.instance` | number | The object instance of the changed object.                                                                   |
| `response.timeRemaining`            | number | The remaining time of the subscription in seconds                                                            |
| `response.cov`                      | array  |                                                                                                              |
| `response.cov.propertyType`         | number | The property type for the changed value                                                                      |
| `response.cov.value`                | any    | The new value of the changed property. The type depends on the property.                                     |

### Alarm Subject

This subject will fire, when a object in the BACNET device has changed its state. From normal -> off normal, for example. In order for this to work, the correct Notification class needs to be activated (see, [activateNotificationClass](#Activate-Notification-Class)) and the BACnet object need to have limit alarm enabled (see [setAlarming](#Set-Alarming)). NOTE: CURRENT THIS IS NOT IMPLEMENTED YET...

#### Example

```js
import { BacnetDriverExtended, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriverExtended({});
bacnetDriver.alarmingObservable.subscribe(console.log)
bacnet.setAlarming({
    address: '192.168.0.1',
    deviceId: 1,
    objectType: ObjectType.ANALOG_INPUT
    objectInstance: 1,
    lowlimit: { enable: true, overwriteLimitValue: 0 },
    highlimit: { enable: true, overwriteLimitValue: 100 },
});
bacnet.activateNotificationClasses({
    address: '192.168.0.1',
    deviceId: 1,
    objectInstances: [ 100, 101, 102],
    ipAddress: '192.168.0.254',
});
```

#### Returns - `AlarmingEvent`

| Name                         | Type   | Description                                                                                              |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `response`                   | object |                                                                                                          |
| `response.processNumber`     | number | The processNumber of the subscription                                                                    |
| `response.device`            | object | The device from which the notification came from                                                         |
| `response.device.instance`   | number | The instance number of the device                                                                        |
| `response.device.type`       | number | The type of the device (which will always be 8)                                                          |
| `response.object`            | object | The object from which the notification came from                                                         |
| `response.object.instance`   | number | The instance number of the object                                                                        |
| `response.object.type`       | number | The type of the object                                                                                   |
| `response.date`              | Date   | The date on which the notification has been send                                                         |
| `response.priority`          | number | The priority given to the notification                                                                   |
| `response.notificationClass` | number | The instance of the notificationClass the notification came from                                         |
| `response.eventType`         | number | The eventType of the notification. The complete eventType list can be found under the Enum's `EventType` |
| `response.notificationType`  | number | The notification type of the notification. Complete list can be found under the Enum's `NotifyType`      |
| `response.fromState`         | number | The state the object was in. Complete list can be found under the Enum's `EventState`                    |
| `response.toState`           | number | The state the object is in now. Complete list can be found under the Enum's `EventState`                 |

### Error Subject

This subject will fire, when the UDP transporter has failed to send your message. This can occure when you gave this transporter an invalid IP address.

#### Example

```js
import { BacnetDriver } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriver({});
bacnetDrive.errorObservable.subscribe(console.log);
```

#### Returns

| Name       | Type  | Description                |
| ---------- | ----- | -------------------------- |
| `response` | Error | The error that has occured |

## License

[The GNU GPL v2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)

Copyright (c) 2020 Bastiaan Verhaar <verhaar.bastiaan@gmail.com>

**Note:** This is not an official product of the BACnet Advocacy Group. BACnet®
is a registered trademark of American Society of Heating, Refrigerating and
Air-Conditioning Engineers (ASHRAE).
