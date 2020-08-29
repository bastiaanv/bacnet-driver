import { ApplicationTags, ObjectType } from '../enum';
import { AbstractSytaxtNotation } from '../asn';
import { TransporterBuffer } from '../interfaces/transporter.buffer';

export class IAm {
    public static decode(buffer: TransporterBuffer): null | { length: number, deviceId: number } {
        let result;
        let apduLen = 0;
        const orgOffset = buffer.offset;

        result = AbstractSytaxtNotation.decodeTagNumberAndValue(buffer.buffer, buffer.offset + apduLen);
        apduLen += result.length;
        if (result.tagNumber !== ApplicationTags.OBJECTIDENTIFIER) {
            return null;
        }

        result = AbstractSytaxtNotation.decodeObjectId(buffer.buffer, buffer.offset + apduLen);
        apduLen += result.length;
        if (result.objectType !== ObjectType.DEVICE) {
            return null;
        }
        const deviceId = result.instance;

        return { length: buffer.offset - orgOffset, deviceId };
    }
}