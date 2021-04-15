import { ApplicationProtocolDataUnit } from '../apdu';
import { ASN1_MAX_INSTANCE } from '../enum';
import { NotificationEvent } from '../interfaces/events/notification/notification.event';
import { TransporterBuffer } from '../interfaces/transporter.buffer';

export class Notification {
    public static decode(buffer: TransporterBuffer): null | NotificationEvent {
        const processNumber = this.decodeUint(buffer).value;

        const deviceIdentifier = this.decodeUint(buffer).value;
        const deviceType = deviceIdentifier >> 22;
        const deviceInstance = deviceIdentifier & ASN1_MAX_INSTANCE;

        const objectIdentifier = this.decodeUint(buffer).value;
        const objectType = objectIdentifier >> 22;
        const objectInstance = objectIdentifier & ASN1_MAX_INSTANCE;

        // Skip 2 opening tags
        buffer.offset += 2;

        const date = this.decodeDateTime(buffer);
        if (!date) {
            return null;
        }

        // Skip 2 closing tags
        buffer.offset += 2;

        const notificationClass = this.decodeUint(buffer).value;
        const priority = this.decodeUint(buffer).value;
        const eventType = this.decodeUint(buffer).value;
        const notificationType = this.decodeUint(buffer).value;
        
        // Skip ackRequired
        buffer.offset += 2;

        const fromState = this.decodeUint(buffer).value;
        const toState = this.decodeUint(buffer).value;


        return {
            processNumber,
            device: { instance: deviceInstance, type: deviceType },
            object: { instance: objectType, type: objectInstance },
            date,
            notificationClass,
            priority,
            eventType,
            notificationType,
            fromState,
            toState,
        };
    }

    private static decodeUint(buffer: TransporterBuffer) {
        const applicationTag = ApplicationProtocolDataUnit.decodeTag(buffer);
        const value = buffer.buffer.readFloatBE(buffer.offset);
        buffer.offset += applicationTag.length;

        return { value };
    }

    private static decodeDateTime(buffer: TransporterBuffer) {
        // Skip tag
        buffer.offset++;

        const year = buffer.buffer[buffer.offset++] + 1900;
        const month = buffer.buffer[buffer.offset++];
        const day = buffer.buffer[buffer.offset++];
        const wDay = buffer.buffer[buffer.offset++];
        const hour = buffer.buffer[buffer.offset++];
        const min = buffer.buffer[buffer.offset++];
        const sec = buffer.buffer[buffer.offset++];
        const hundredths = buffer.buffer[buffer.offset++];
        if (month === 0xFF && day === 0xFF && wDay === 0xFF && (year - 1900) === 0xFF ||
            hour === 0xFF && min === 0xFF && sec === 0xFF && hundredths === 0xFF) {
                // Invalid date recieved
            return null;
        }
        
        return new Date(year, month, day, hour, min, sec, hundredths);
    }
}
