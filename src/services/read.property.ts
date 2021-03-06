import { TransporterBuffer } from '../interfaces/transporter.buffer';
import { ASN1_MAX_OBJECT, ASN1_MAX_PROPERTY_ID, ApplicationTags, ASN1_MAX_INSTANCE, PropertyIdentifier } from '../enum';
import { AbstractSytaxtNotation } from '../asn';
import { ApplicationProtocolDataUnit } from '../apdu';
import { ReadNumber } from '../interfaces/events/readProperty/read.number';
import { ReadString } from '../interfaces/events/readProperty/read.string';

export class ReadProperty {
    public static encode(buffer: TransporterBuffer, objectType: number, objectInstance: number, propertyId: number, reject: (message: string) => void): void {
        if (objectType > ASN1_MAX_OBJECT) {
            reject("Invalid objectType given...");
        }
        if (propertyId > ASN1_MAX_PROPERTY_ID) {
            reject("Invalid propertyId given...");
        }

        AbstractSytaxtNotation.encodeContextObjectId(buffer, 0, objectType, objectInstance);
        AbstractSytaxtNotation.encodeContextUnsigned(buffer, 1, propertyId);
    }

    public static decode(buffer: TransporterBuffer): any {
        // Skip reading the object information
        buffer.offset += 6;

        const propertyId = buffer.buffer.readIntBE(buffer.offset, 1);

        // Adjust the offset for reading the propertyId and skip the opening tag
        buffer.offset += 2;

        if (propertyId === PropertyIdentifier.OBJECT_LIST) {
            return this.readList(buffer);
        }
        
        return this.readValue(buffer);
    }

    public static readValue(buffer: TransporterBuffer): any {
        const applicationTag = ApplicationProtocolDataUnit.decodeTag(buffer);
        if (applicationTag.tagNumber === ApplicationTags.UNSIGNED_INTEGER << 4 ||
            applicationTag.tagNumber === ApplicationTags.ENUMERATED << 4) {
            return this.readUInt(buffer, applicationTag.length);
        }
        
        if (applicationTag.tagNumber === ApplicationTags.REAL << 4) {
            return this.readFloat(buffer, applicationTag.length);
        }

        if (applicationTag.tagNumber === ApplicationTags.BOOLEAN << 4) {
            return this.readBoolean(buffer, applicationTag.length);
        }

        if (applicationTag.tagNumber === ApplicationTags.CHARACTER_STRING << 4) {
            return this.readString(buffer, applicationTag.length);
        }

        if (applicationTag.tagNumber === ApplicationTags.BIT_STRING << 4) {
            return this.readBitString(buffer);
        }

        return null
    }

    private static readUInt(buffer: TransporterBuffer, tagLength: number): ReadNumber {
        const value =  buffer.buffer.readUIntBE(buffer.offset, tagLength);
        buffer.offset += tagLength;
    
        return { value };
    }

    private static readFloat(buffer: TransporterBuffer, tagLength: number): ReadNumber {
        const value = buffer.buffer.readFloatBE(buffer.offset);
        buffer.offset += tagLength;

        return { value };
    }

    private static readBoolean(buffer: TransporterBuffer, tag: number): ReadNumber {
        buffer.offset++;

        return { value: (tag & 0x01) };
    }

    private static readString(buffer: TransporterBuffer, tagLength: number): ReadString {
        const value = buffer.buffer.toString('utf8', buffer.offset+1, buffer.offset + tagLength);
        buffer.offset += tagLength;

        return { value };
    }

    private static readBitString(buffer: TransporterBuffer): ReadNumber[] {
        const unusedBits = buffer.buffer[buffer.offset++];
        const encodedBitString = buffer.buffer[buffer.offset++];

        const output: ReadNumber[] = [];
        for (let i = 0; i < 8-unusedBits; i++) {
            output.push({ value: (encodedBitString & (1 << i)) })
        }

        return output;
    }

    private static readList(buffer: TransporterBuffer): any[] {
        const result: any[] = [];
        const objectIdentifierMask = ApplicationTags.OBJECTIDENTIFIER << 4;
        const end = buffer.buffer.length -1;
        while (buffer.offset < end) {
            const applicationTag = ApplicationProtocolDataUnit.decodeTag(buffer);
            if (applicationTag.tagNumber === objectIdentifierMask) {
                const value = buffer.buffer.readUIntBE(buffer.offset, 4);
                result.push({ objectType: value >> 22, instanceNumber: value & ASN1_MAX_INSTANCE });
    
                buffer.offset += 4;
            }
        }

        return result;
    }
}