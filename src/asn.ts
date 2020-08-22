import { ASN1_INSTANCE_BITS, ASN1_MAX_INSTANCE, ASN1_MAX_OBJECT } from './enum';

export class AbstractSytaxtNotation {
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

    private static isExtendedValue(x: number): boolean {
        return (x & 0x07) === 5;
      };
      
    private static isOpeningTag(x: number): boolean {
        return (x & 0x07) === 6;
      };
      
    private static isClosingTag(x: number): boolean {
        return (x & 0x07) === 7;
      };
}