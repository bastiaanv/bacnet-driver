# Bacnet-driver
A BACnet protocol stack written in pure typescript with RXJS and promises. BACnet is a protocol to interact with building automation devices defined by ASHRAE. Big shout out to FH1CH for making the [node-bacstack library](https://github.com/fh1ch/node-bacstack). A lot of priniciples there, are used here.

<p align="center">
<a href="https://www.codacy.com/manual/bastiankpn7800/bacnet-driver?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=bastiaanv/bacnet-driver&amp;utm_campaign=Badge_Grade"><img src="https://app.codacy.com/project/badge/Grade/1c0c7887e2f841218936eefd65768a22"/></a>
<a href="https://github.com/bastiaanv/bacnet-driver/actions?query=workflow%3A%22Build+npm+package%22"><img src="https://github.com/bastiaanv/bacnet-driver/workflows/Build%20npm%20package/badge.svg"/></a>
</p>

## Table of Contents

- [Usage](#Usage)
- [Features](#Features)
- [API Basic](#API--Basic)
    - [Read property](#Read-Property)
    - [Subscribe COV](#Subscribe-COV)
    - [Write property](#Write-Property)
    - [Who Is](#Who-Is)
- [API Extended](#API---Extended)
    - [Read Object List](#Read-Object-List)
- [Events](#Events)
    - [I Am Subject](#I-Am-Subject)
    - [Error Subject](#Error-Subject)
- [License](#License)

## Usage
Add Bacnet-driver to your project by:

1) Adding the .npmrc file:
```
registry=https://npm.pkg.github.com/bastiaanv
```

2) Running the following npm command:
```
npm i @bastiaanv@bacnet-driver
```

## Features
**NOTE** this library is still in pre-alpa and is not recommended in poduction usages. For those case, please use the [node-bacstack library](https://github.com/fh1ch/node-bacstack).

| Service       | Receive | execute    |
|---------------|---------|------------|
| whoIs         | No      | Yes        |
| iAm           | Yes     | No         |
| readProperty  | No      | Partly     |
| writeProperty | No      | Partly     |
| readMultiple  | No      | No         |
| writeMultiple | No      | No         |
| Subscribe COV | No      | Yes        |

readProperty: This service can only read unsigned integers, floats, booleans, strings and ObjectIndentifiers

writeProperty: Unsupported types: TIMESTAMP, OCTET_STRING, OBJECTIDENTIFIER, COV_SUBSCRIPTION, READ_ACCESS_RESULT, READ_ACCESS_SPECIFICATION

## API - Basic
For an exmaple, please take a look at the `example` folder within this project.

### Read Property
The readProperty command reads a single property of an object from a device.
#### Example
```js
import { BacnetDriver, ObjectType, PropertyIdentifier } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver.readProperty({
    address: '192.168.1.2',
    deviceId: 2000,
    objectType: ObjectType.ANALOG_INPUT,
    objectInstance: 1,
    propertyId: PropertyIdentifier.PRESENT_VALUE
}).then(console.log)
```
#### Parameters - `ReadPropertyOptions`
| Name                     | Type   | Description                                                                                                        |
|--------------------------|--------|--------------------------------------------------------------------------------------------------------------------|
| `options`                | object |                                                                                                                    |
| `options.address`        | string | IP address of the target device.                                                                                   |
| `options.deviceId`       | number | The device ID of the target device.                                                                                |
| `options.objectType`     | number | The object ID to read. The `ObjectType` could be used from the bacnetDriver enum.                                  |
| `options.objectInstance` | number | The object instance to read.                                                                                       |
| `options.propertyId`     | number | The property ID in the specified object to read.The `PropertyIdentifier` could be used from the bacnetDriver enum. |
#### Returns
The returned value depens on the propertyID you have read. This is why the this method returns the `Promise<any>`. But when you you the [BacnetDriverExtended](#API---Extended) you can use the predefined methods and will get the correct return type.
| Name       | Type                                                                                      | Description |
|------------|-------------------------------------------------------------------------------------------|-------------|
| `response` | Promise\<any\> \| Promise\<ReadString\> \| Promise\<ReadNumber\> \| Promise\<ReadObject\> |             |

### Subscribe COV
The Subscribe COV command subscribes your application to a specific object in the BACNET device. If a value in the object changes, a [covObservable](#Cov-Subject) will be fired.
#### Example
```js
import { BacnetDriver, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver.subscribeCov({
    address: '192.168.1.2',
    deviceId: 2000,
    monitoredObject: { type: ObjectType.ANALOG_INPUT, instance: 8 },
    cancellable: { issueConfirmedNotifications: false, lifetime: 120 }
}).then(console.log)
```
#### Parameters - `COVOptions`
| Name                                              | Type    | Description                                                                       |
|---------------------------------------------------|---------|-----------------------------------------------------------------------------------|
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
|------------|-----------------|-------------|
| `response` | Promise\<void\> |             |


### Write Property
The writeProperty command writes a single property of an object to a device. Please note, that the following `ApplicationTags` are not supported yet: TIMESTAMP, OCTET_STRING, OBJECTIDENTIFIER, COV_SUBSCRIPTION, READ_ACCESS_RESULT, READ_ACCESS_SPECIFICATION
#### Example
```js
import { BacnetDriver, ObjectType, PropertyIdentifier, ApplicationTags } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver.writeProperty({
    address: '192.168.1.2',
    deviceId: 2000,
    objectType: ObjectType.ANALOG_INPUT,
    objectInstance: 1,
    propertyId: PropertyIdentifier.OUT_OF_SERVICE,
    values: [
        {type: ApplicationTags.BOOLEAN, value: true}
    ]
}).then(console.log)
```
#### Parameters - `WritePropertyOptions`
| Name                     | Type   | Description                                                                                                        |
|--------------------------|--------|--------------------------------------------------------------------------------------------------------------------|
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
|------------|-----------------|-------------|
| `response` | Promise\<void\> |             |

### Who Is
The whoIs command discovers all BACNET devices in a network. BACNET devices who has received this command will sent a [IAm command](#I-Am-Subject).
#### Example
```js
import { BacnetDriver } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriver({});
bacnetDriver.whoIs();
```
#### Parameters
None

## API - Extended
The BacnetDriverExtended has predefined BACNET methods for you to use, like: `readObjectList` or `readPresentValue`. Each of these methods make use of the `readProperty` or `writeProperty` method.

### Read Object List
The readObjectList command reads the object list of a BACNET device.
#### Example
```js
import { BacnetDriverExtended, ObjectType, PropertyIdentifier } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDriverExtended({});
bacnetDriver.readObjectList({
    address: '192.168.1.2',
    deviceId: 2000
}).then(console.log)
```
#### Parameters
| Name                     | Type   | Description                          |
|--------------------------|--------|--------------------------------------|
| `options`                | object |                                      |
| `options.address`        | string | IP address of the target device.     |
| `options.deviceId`       | number | The device ID of the target device.   |
#### Returns
| Name       | Type                  | Description |
|------------|-----------------------|-------------|
| `response` | Promise<ReadObject[]> |             |

## Events
This library makes use of [RXJS](https://rxjs-dev.firebaseapp.com/guide/overview) library. 

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
|---------------------|--------|-------------------------------------|
| `response`          | object |                                     |
| `response.address`  | string | IP address of the target device.    |
| `response.deviceId` | number | The device ID of the target device. |

### Cov-Subject
This subject will fire, when a object in the BACNET device has been changed and the Bacnet driver has a active subscription, see more (Subscribe Cov)[#Subscribe-Cov].
#### Example
```js
import { BacnetDriver, ObjectType } from '@bastiaanv/bacnet-driver';

const bacnetDriver = new BacnetDiver({});
bacnetDriver.covObservable.subscribe(console.log)
bacnetDriver.subscribeCov({
    address: '192.168.1.2',
    deviceId: 2000,
    monitoredObject: { type: ObjectType.ANALOG_INPUT, instance: 8 },
    cancellable: { issueConfirmedNotifications: false, lifetime: 120 }
}).then(console.log)
```
#### Returns - `COVEvent`
| Name                                | Type   | Description                                                                                                  |
|-------------------------------------|--------|--------------------------------------------------------------------------------------------------------------|
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
|------------|-------|----------------------------|
| `response` | Error | The error that has occured |

## License

[The GNU GPL v2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)

Copyright (c) 2020 Bastiaan Verhaar <verhaar.bastiaan@gmail.com>

**Note:** This is not an official product of the BACnet Advocacy Group. BACnet®
is a registered trademark of American Society of Heating, Refrigerating and
Air-Conditioning Engineers (ASHRAE).
