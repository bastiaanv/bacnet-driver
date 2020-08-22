import { TransporterBuffer } from './interfaces/transporter.buffer';
import { PduTypes, PDU_TYPE_MASK } from './enum';

export class ApplicationProtocolDataUnit {
    public static encodeUnconfirmedServiceRequest(buffer: TransporterBuffer, service: number) {
        buffer.buffer[buffer.offset++] = PduTypes.UNCONFIRMED_REQUEST;
        buffer.buffer[buffer.offset++] = service;
    }

    public static getDecodedType(buffer: TransporterBuffer): number {
        return buffer.buffer[buffer.offset] & PDU_TYPE_MASK;
    }

    public static decodeUnconfirmedServiceRequest(buffer: TransporterBuffer): {length: number, service: number} {
        const orgOffset = buffer.offset;
        buffer.offset++; // Increase offset, because we do not need type
        const service = buffer.buffer[buffer.offset++];

        return {
          length: buffer.offset - orgOffset,
          service: service
        };
      };
}