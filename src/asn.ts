import { ASN1_INSTANCE_BITS, ASN1_MAX_INSTANCE, ASN1_MAX_OBJECT, ApplicationTags, CharacterStringEncoding } from './enum';
import { TransporterBuffer } from './interfaces/transporter.buffer';
import { WriteValue } from './interfaces/events/writeProperty/write.value';

export class AbstractSytaxtNotation {
    public static encodeApplicationData(buffer: TransporterBuffer, value: WriteValue, reject: (message: string) => void): void {
        switch (value.type) {
            case ApplicationTags.NULL:
                return this.encodeApplicationNull(buffer);

            case ApplicationTags.BOOLEAN:
                return this.encodeApplicationBoolean(buffer, value.value);

            case ApplicationTags.UNSIGNED_INTEGER:
                return this.encodeApplicationUnsigned(buffer, value.value);

            case ApplicationTags.SIGNED_INTEGER:
                return this.encodeApplicationSigned(buffer, value.value);

            case ApplicationTags.REAL:
                return this.encodeApplicationReal(buffer, value.value);

            case ApplicationTags.DOUBLE:
                return this.encodeApplicationDouble(buffer, value.value);

            case ApplicationTags.CHARACTER_STRING:
                if (value.encoding !== CharacterStringEncoding.UTF_8) {
                    reject('Characterset not supported...');
                }

                return this.encodeApplicationCharacterString(buffer, value.value);

            case ApplicationTags.BIT_STRING:
                return this.encodeApplicationBitstring(buffer, value.value);

            case ApplicationTags.ENUMERATED:
                return this.encodeApplicationEnumerated(buffer, value.value);

            case ApplicationTags.DATE:
                return this.encodeApplicationDate(buffer, value.value);

            case ApplicationTags.TIME:
                return this.encodeApplicationTime(buffer, value.value);
                
            case ApplicationTags.DATETIME:
                this.encodeApplicationDate(buffer, value.value);
                this.encodeApplicationTime(buffer, value.value);
                return;

            case ApplicationTags.OPENING_TAG:
                return this.encodeTag(buffer, +value.value, 6, true);

            case ApplicationTags.CLOSING_TAG:
                return this.encodeTag(buffer, +value.value, 7, true);

            case ApplicationTags.OCTET_STRING:
                return this.encodeApplicationOctetString(buffer, value.value);

            default:
                reject('Unknown encoding type...');
        }
    }

    public static encodeContextObjectId(buffer: TransporterBuffer, tagNumber: number, objectType: number, instance: number): void {
        this.encodeTag(buffer, tagNumber, 4, true);
        this.encodeBacnetObjectId(buffer, objectType, instance);
    }

    public static encodeContextBoolean(buffer: TransporterBuffer, tagNumber: number, booleanValue: boolean) {
        this.encodeTag(buffer, tagNumber, 1, true);
        buffer.buffer.writeUInt8(booleanValue ? 1 : 0, buffer.offset);
        buffer.offset += 1;
    }

    public static encodeContextUnsigned(buffer: TransporterBuffer, tagNumber: number, value: number): void {
        const length = this.getUnsignedLength(value);
        this.encodeTag(buffer, tagNumber, length, true);

        buffer.buffer.writeUIntBE(value, buffer.offset, length);
        buffer.offset += length;
    }

    public static encodeContextEnumerated(buffer: TransporterBuffer, tagNumber: number, value: number) {
        const length = this.getUnsignedLength(value);
        this.encodeTag(buffer, tagNumber, length, true);

        buffer.buffer.writeUIntBE(value, buffer.offset, length);
        buffer.offset += length;
    }

    public static decodeUnsigned(buffer: Buffer, offset: number, length: number): number {
        return buffer.readUIntBE(offset, length);
    }

    public static decodeObjectId(buffer: Buffer, offset: number): {length: number, objectType: number, instance: number} {
        const length = 4;
        const result = this.decodeUnsigned(buffer, offset, length);
        const objectType = (result >> ASN1_INSTANCE_BITS) & ASN1_MAX_OBJECT;
        const instance = result & ASN1_MAX_INSTANCE;

        return { length, objectType, instance };
    }

    public static decodeTagNumber(buffer: Buffer, offset: number): { length: number, tagNumber: number } {
        return {length: 1, tagNumber: buffer[offset] >> 4};
    }

    public static decodeTagNumberAndValue(buffer: Buffer, offset: number): {length: number, tagNumber: number, value: number} {
        const tagNumber = this.decodeTagNumber(buffer, offset).tagNumber;
        const value = buffer[offset] & 0x07;

        return { length: 1, tagNumber, value };
    }

    public static encodeTag(buffer: TransporterBuffer, tagNumber: number, length: number, contextSpecific: boolean): void {
        const context = contextSpecific ? (1 << 3) : 0;

        if (tagNumber <= 14) {
            buffer.buffer[buffer.offset++] = context | (tagNumber << 4) | length;
        
        } else {
            buffer.buffer[buffer.offset++] = context | 0xF0 | length;
            buffer.buffer[buffer.offset++] = tagNumber;
        }
    }

    private static encodeBacnetObjectId(buffer: TransporterBuffer, objectType: number, instance: number): void {
        const value = objectType << 22 | instance;
        buffer.buffer.writeIntBE(value, buffer.offset, 4);
        buffer.offset += 4;
    }

    private static encodeApplicationNull(buffer: TransporterBuffer) {
        buffer.buffer[buffer.offset++] = ApplicationTags.NULL;
    }

    private static encodeApplicationBoolean(buffer: TransporterBuffer, value: boolean): void {
        this.encodeTag(buffer, ApplicationTags.BOOLEAN, value ? 1 : 0, false);
    }

    private static encodeApplicationOctetString(buffer: TransporterBuffer, value: number[]): void {
        buffer.buffer[buffer.offset++] = 0x65;
        buffer.buffer[buffer.offset++] = value.length;

        for(const octet of value) {
            buffer.buffer[buffer.offset++] = octet;
        }
    }

    private static encodeApplicationUnsigned(buffer: TransporterBuffer, value: number) {
        const length = this.getUnsignedLength(value);
        this.encodeTag(buffer, ApplicationTags.UNSIGNED_INTEGER, length, false);
        buffer.buffer.writeUIntBE(value, buffer.offset, length);
        buffer.offset += length;
    }

    private static encodeApplicationSigned(buffer: TransporterBuffer, value: number) {
        const length = this.getSignedLength(value);
        this.encodeTag(buffer, ApplicationTags.SIGNED_INTEGER, length, false);
        buffer.buffer.writeIntBE(value, buffer.offset, length);
        buffer.offset += length;
    }

    private static encodeApplicationReal(buffer: TransporterBuffer, value: number) {
        this.encodeTag(buffer, ApplicationTags.REAL, 4, false);
        buffer.buffer.writeFloatBE(value, buffer.offset);
        buffer.offset += 4;
    }

    private static encodeApplicationDouble(buffer: TransporterBuffer, value: number) {
        this.encodeTag(buffer, ApplicationTags.DOUBLE, 8, false);
        buffer.buffer.writeDoubleBE(value, buffer.offset);
        buffer.offset += 8;
    }

    private static encodeApplicationCharacterString(buffer: TransporterBuffer, value: string) {
        this.encodeTag(buffer, ApplicationTags.CHARACTER_STRING, value.length, false);

        buffer.buffer[buffer.offset++] = CharacterStringEncoding.UTF_8;
        const tmpBuffer = Buffer.from(value, 'utf8');
        buffer.buffer.copy(tmpBuffer);
        buffer.offset += tmpBuffer.length;
    }

    private static encodeApplicationBitstring(buffer: TransporterBuffer, value: boolean[]) {
        this.encodeTag(buffer, ApplicationTags.BIT_STRING, value.length, false);

        buffer.buffer[buffer.offset++] = 8 - value.length;

        let booleanToByte = 0;
        for(let i = 0; i < 8; i++) {
            if (value[i]) {
                booleanToByte |= (1 << (7 - i));
            }
        }
        buffer.buffer[buffer.offset++] = booleanToByte;
    }

    private static encodeApplicationEnumerated(buffer: TransporterBuffer, value: number) {
        const length = this.getUnsignedLength(value);
        this.encodeTag(buffer, ApplicationTags.ENUMERATED, length, false);

        buffer.buffer.writeUIntBE(value, buffer.offset, length);
        buffer.offset += length;
    }

    private static encodeApplicationDate(buffer: TransporterBuffer, value: Date) {
        this.encodeTag(buffer, ApplicationTags.DATE, 4, false);

        buffer.buffer[buffer.offset++] = (value.getFullYear() - 1900);
        buffer.buffer[buffer.offset++] = value.getMonth();
        buffer.buffer[buffer.offset++] = value.getDate();
        buffer.buffer[buffer.offset++] = (value.getDay() === 0) ? 7 : value.getDay();
    }

    private static encodeApplicationTime(buffer: TransporterBuffer, value: Date) {
        this.encodeTag(buffer, ApplicationTags.TIME, 4, false);
        
        buffer.buffer[buffer.offset++] = value.getHours();
        buffer.buffer[buffer.offset++] = value.getMinutes();
        buffer.buffer[buffer.offset++] = value.getSeconds();
        buffer.buffer[buffer.offset++] = value.getMilliseconds() / 10;
      }

    private static getUnsignedLength(value: number): number {
        if (value < 0x100) {
            return 1;
        } else if (value < 0x10000) {
            return 2;
        } else if (value < 0x1000000) {
            return 3;
        } else {
            return 4;
        }
    }

    private static getSignedLength(value: number): number {
        if ((value >= -128) && (value < 128)) {
            return 1;
        } else if ((value >= -32768) && (value < 32768)) {
            return 2;
        } else if ((value > -8388608) && (value < 8388608)) {
            return 3;
        } else {
            return 4;
        }
    }
}