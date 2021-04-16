import { APPLICATION_TAG_LENGTH, APPLICATION_TAG_MASK, ASN1_MAX_INSTANCE } from '..';
import { AbstractSytaxtNotation } from '../asn';
import { COVEvent } from '../interfaces/events/cov/change.on.value.event';
import { COVOptions } from '../interfaces/events/cov/change.on.value.options';
import { TransporterBuffer } from '../interfaces/transporter.buffer';
import { ReadProperty } from './read.property';

export class COV {
    public static encode(buffer: TransporterBuffer, options: COVOptions): void {
        AbstractSytaxtNotation.encodeContextUnsigned(buffer, 0, options.processId!);
        AbstractSytaxtNotation.encodeContextObjectId(buffer, 1, options.monitoredObject.type, options.monitoredObject.instance);
        if (options.cancellable) {
            AbstractSytaxtNotation.encodeContextBoolean(buffer, 2, options.cancellable.issueConfirmedNotifications);
            AbstractSytaxtNotation.encodeContextUnsigned(buffer, 3, options.cancellable.lifetime);
        }
    }

    public static decode(buffer: TransporterBuffer): COVEvent {
        // ProcessId
        const processIdContextTag = buffer.buffer[buffer.offset++];
        const processIdLength = processIdContextTag & 7;
        const processId = buffer.buffer.readUIntBE(buffer.offset, processIdLength);
        buffer.offset += processIdLength;

        // DeviceId
        buffer.offset++; // Skip context tag
        const deviceObject = buffer.buffer.readUIntBE(buffer.offset, 4);
        const device = { instance: deviceObject & ASN1_MAX_INSTANCE, type: 8 }; // It is always the device object type that will initiate the call
        buffer.offset += 4;

        // objectId
        buffer.offset++; // Skip context tag
        const monitoredObjectValue= buffer.buffer.readUIntBE(buffer.offset, 4);
        const monitoredObject = { instance: monitoredObjectValue & ASN1_MAX_INSTANCE, type: monitoredObjectValue >> 22 }
        buffer.offset += 4;

        // Time remaining
        const timeRemainingContextTag = buffer.buffer[buffer.offset++];
        const timeRemainingLength = timeRemainingContextTag & 7;
        const timeRemaining = buffer.buffer.readUIntBE(buffer.offset, timeRemainingLength);
        buffer.offset += timeRemainingLength;

        // Changed values
        const cov: Array<{propertyType: number, value: any}> = [];
        buffer.offset++; // Skip opening tag
        while (this.isClosingTag(buffer)) {
            const propertyTypeContextTag = buffer.buffer[buffer.offset++];
            const propertyTypeLength = propertyTypeContextTag & APPLICATION_TAG_LENGTH;
            const propertyType = buffer.buffer.readUIntBE(buffer.offset, propertyTypeLength);
            buffer.offset += propertyTypeLength + 1; // Also skip opening tag

            const value = ReadProperty.readValue(buffer);
            buffer.offset++; // Skip closing tag

            cov.push({propertyType, value});
        }

        return { processId, device, monitoredObject, timeRemaining, cov }
    }

    private static isClosingTag(buffer: TransporterBuffer): boolean {
        return (buffer.buffer.readUIntBE(buffer.offset, 1) & 7) !== 7;
    }
}
