import { TransporterBuffer } from './interfaces/transporter.buffer';
import { NpduControlBits, NetworkLayerMessageType } from './enum';

export class NetworkProtocolDataUnit {
    private static readonly BACNET_PROTOCOL_VERSION = 1;
    private static readonly BacnetAddressTypes = { NONE: 0, IP: 1 };

    public static encode(buffer: TransporterBuffer, funct: number, destination: string, hopCount: number) {
        buffer.buffer[buffer.offset++] = this.BACNET_PROTOCOL_VERSION;
        buffer.buffer[buffer.offset++] = funct | NpduControlBits.DESTINATION_SPECIFIED;
        
        if (destination === '255.255.255.255') {
            buffer.buffer[buffer.offset++] = 0xFF; // Network address -> 65535 when broadcast
            buffer.buffer[buffer.offset++] = 0xFF; // Network address
            buffer.buffer[buffer.offset++] = 0x00; // Mac layer address -> zero when broadcast
        }

        // Set hop count
        buffer.buffer[buffer.offset++] = hopCount;
    }

    public static decode(buffer: Buffer, offset: number): null | { length: number, function: number } {
        const orgOffset = offset;
        offset++;

        const funct = buffer[offset++];

        if (funct & NpduControlBits.DESTINATION_SPECIFIED) {
            const tmpDestination = this.decodeTarget(buffer, offset);
            offset += tmpDestination.length;
        }

        if (funct & NpduControlBits.SOURCE_SPECIFIED) {
            const tmpSource = this.decodeTarget(buffer, offset);
            offset += tmpSource.length;
        }
        
        if (funct & NpduControlBits.DESTINATION_SPECIFIED) {
            offset++;
        }

        if (funct & NpduControlBits.NETWORK_LAYER_MESSAGE) {
            const networkMsgType = buffer[offset++];
            if (networkMsgType >= 0x80 || networkMsgType === NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK) {
                offset += 2;
            }
        }
        
        if (buffer[orgOffset + 0] !== this.BACNET_PROTOCOL_VERSION) {
            return null;
        }

        return {
          length: offset - orgOffset,
          function: funct,
        };
    }

    private static decodeTarget(buffer: Buffer, offset: number): { length: number, target: {type: number, net: number, adr: number[]} } {
        let length = 0;
        const target: {type: number, net: number, adr: number[]} = {type: this.BacnetAddressTypes.NONE, net: (buffer[offset + length++] << 8) | (buffer[offset + length++] << 0), adr: []};
        const adrLen = buffer[offset + length++];
        if (adrLen > 0) {
          for (let i = 0; i < adrLen; i++) {
            target.adr.push(buffer[offset + length++]);
          }
        }

        return { target, length };
      };
}