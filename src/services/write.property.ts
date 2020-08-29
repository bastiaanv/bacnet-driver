import { TransporterBuffer } from '../interfaces/transporter.buffer';
import { AbstractSytaxtNotation } from '../asn';
import { ASN1_MAX_PROPERTY_ID, ASN1_MAX_OBJECT } from '../enum';
import { WriteValue } from '../interfaces/events/writeProperty/write.value';

export class WriteProperty {
    public static encode(buffer: TransporterBuffer, objectType: number, objectInstance: number, propertyId: number, values: WriteValue[], reject: (message: string) => void): void {
        if (objectType > ASN1_MAX_OBJECT) {
            reject("Invalid objectType given...");
        }
        if (propertyId > ASN1_MAX_PROPERTY_ID) {
            reject("Invalid propertyId given...");
        }

        AbstractSytaxtNotation.encodeContextObjectId(buffer, 0, objectType, objectInstance);
        AbstractSytaxtNotation.encodeTag(buffer, 3, 6, true);

        values.forEach((value) => {
            AbstractSytaxtNotation.encodeApplicationData(buffer, value, reject);
        });

        AbstractSytaxtNotation.encodeTag(buffer, 3, 7, true);
        AbstractSytaxtNotation.encodeContextUnsigned(buffer, 1, propertyId);
    }
}