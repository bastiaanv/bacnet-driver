import { ASN1_INSTANCE_BITS, ASN1_MAX_INSTANCE, ASN1_MAX_OBJECT } from './enum';
import { TransporterBuffer } from './interfaces/transporter.buffer';

export class AbstractSytaxtNotation {
    public static encodeContextObjectId(buffer: TransporterBuffer, tagNumber: number, objectType: number, instance: number): void {
        AbstractSytaxtNotation.encodeTag(buffer, tagNumber, 4);
        AbstractSytaxtNotation.encodeBacnetObjectId(buffer, objectType, instance);
    }

    public static encodeContextUnsigned(buffer: TransporterBuffer, tagNumber: number, value: number): void {
        const length = AbstractSytaxtNotation.getUnsignedLength(value);

        AbstractSytaxtNotation.encodeTag(buffer, tagNumber, length);
        AbstractSytaxtNotation.writeValue(buffer, value, length);
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

    private static writeValue(buffer: TransporterBuffer, value: number, length?: number): void {
        if (!length) {
            length = AbstractSytaxtNotation.getUnsignedLength(value);
        }

        buffer.buffer.writeIntBE(value, buffer.offset, length);
        buffer.offset += length;
    }

    private static encodeTag(buffer: TransporterBuffer, tagNumber: number, length: number): void {
        buffer.buffer[buffer.offset++] = (tagNumber << 4) | 1 << 3 | length;
    }

    private static encodeBacnetObjectId(buffer: TransporterBuffer, objectType: number, instance: number): void {
        const value = objectType << 22 | instance;
        AbstractSytaxtNotation.writeValue(buffer, value, 4);
    }

    private static getUnsignedLength(value: number): number {
        if (value < 0x100) return 1;
        else if (value < 0x10000) return 2;
        else if (value < 0x1000000) return 3;
        else return 4;
      }
}