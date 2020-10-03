import { TransporterBuffer } from './interfaces/transporter.buffer';
import { PduTypes, PduConReqBits, MaxSegmentsAccepted, MaxApduLengthAccepted, APPLICATION_TAG_MASK, APPLICATION_TAG_LENGTH } from './enum';
import { ComplexAcknowledge } from './interfaces/apdu/complex.acknowledge';
import { SimpleAcknowledge } from './interfaces/apdu/simple.acknowledge';

export class ApplicationProtocolDataUnit {
    public static encodeUnconfirmedServiceRequest(buffer: TransporterBuffer, service: number) {
        buffer.buffer[buffer.offset++] = PduTypes.UNCONFIRMED_REQUEST;
        buffer.buffer[buffer.offset++] = service;
    }

    public static getDecodedType(buffer: TransporterBuffer): number {
        return buffer.buffer[buffer.offset];
    }

    public static encodeConfirmedServiceRequest(buffer: TransporterBuffer, service: number, invokeId: number, sequencenumber: number, proposedWindowSize: number, acceptSegmentedResponses: boolean): void {
        const type = PduTypes.CONFIRMED_REQUEST | (acceptSegmentedResponses ? PduConReqBits.SEGMENTED_RESPONSE_ACCEPTED : 0);
        
        buffer.buffer[buffer.offset++] = type;
        buffer.buffer[buffer.offset++] = MaxSegmentsAccepted.SEGMENTS_65 | MaxApduLengthAccepted.OCTETS_1476;
        buffer.buffer[buffer.offset++] = invokeId;

        if ((type & PduConReqBits.SEGMENTED_MESSAGE) > 0) {
            buffer.buffer[buffer.offset++] = sequencenumber;
            buffer.buffer[buffer.offset++] = proposedWindowSize;
        }

        buffer.buffer[buffer.offset++] = service;
    }

    public static encodeSegmentAck(buffer: TransporterBuffer, type: number, originalInvokeId: number, sequencenumber: number, actualWindowSize: number) {
        buffer.buffer[buffer.offset++] = type;
        buffer.buffer[buffer.offset++] = originalInvokeId;
        buffer.buffer[buffer.offset++] = sequencenumber;
        buffer.buffer[buffer.offset++] = actualWindowSize;
    }

    public static encodeComplexAck(buffer: TransporterBuffer, type: number, service: number, invokeId: number, sequencenumber: number, proposedWindowNumber: number): void {
        let len = 3;
        buffer.buffer[buffer.offset++] = type;
        buffer.buffer[buffer.offset++] = invokeId;
        if ((type & PduConReqBits.SEGMENTED_MESSAGE) > 0) {
          buffer.buffer[buffer.offset++] = sequencenumber;
          buffer.buffer[buffer.offset++] = proposedWindowNumber;
          len += 2;
        }
        buffer.buffer[buffer.offset++] = service;
    }

    public static decodeUnconfirmedServiceRequest(buffer: TransporterBuffer): {length: number, service: number} {
        const orgOffset = buffer.offset;
        buffer.offset++; // Increase offset, because we do not need type
        const service = buffer.buffer[buffer.offset++];

        return { length: buffer.offset - orgOffset, service };
    }

    public static decodeTag(buffer: TransporterBuffer): {tagNumber: number, length: number} {
        // Check if tag is an extended value
        if ((buffer.buffer[buffer.offset] & 0x05) === 5) {
            const part1 = buffer.buffer[buffer.offset++];
            const length = buffer.buffer[buffer.offset++];

            return { tagNumber: (part1 & APPLICATION_TAG_MASK), length };
        }

        const value = buffer.buffer[buffer.offset++];
        return { tagNumber: (value & APPLICATION_TAG_MASK), length: (value & APPLICATION_TAG_LENGTH) };
    }

    public static decodeComplexAcknowledge(buffer: TransporterBuffer): ComplexAcknowledge {
        const orgOffset = buffer.offset;
        const type = buffer.buffer[buffer.offset++];
        const invokeId = buffer.buffer[buffer.offset++];

        let sequencenumber = 0;
        let proposedWindowNumber = 0;
        if ((type & PduConReqBits.SEGMENTED_MESSAGE) > 0) {
          sequencenumber = buffer.buffer[buffer.offset++];
          proposedWindowNumber = buffer.buffer[buffer.offset++];
        }

        const service = buffer.buffer[buffer.offset++];

        return { service, invokeId, sequencenumber, proposedWindowNumber, type, length: orgOffset - buffer.offset };
    }

    public static decodeSimpleAcknowledge(buffer: TransporterBuffer): SimpleAcknowledge {
        return {
            type: buffer.buffer[buffer.offset++],
            invokeId: buffer.buffer[buffer.offset++],
            service: buffer.buffer[buffer.offset++],
        };
    }
}
