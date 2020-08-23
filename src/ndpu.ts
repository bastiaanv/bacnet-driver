import { TransporterBuffer } from './interfaces/transporter.buffer';
import { NpduControlBits, NetworkLayerMessageType } from './enum';
import { NpduDestination } from './interfaces/ndpu/destination';
import { Ndpu } from './interfaces/ndpu/ndpu';

export class NetworkProtocolDataUnit {
    private static readonly BACNET_PROTOCOL_VERSION = 1;

    public static encode(buffer: TransporterBuffer, funct: number, destination: NpduDestination, hopCount: number, requireResponse: boolean) {
        const hasDestination = destination.networkAddress.length > 0;

        buffer.buffer[buffer.offset++] = this.BACNET_PROTOCOL_VERSION;
        buffer.buffer[buffer.offset++] = funct | (hasDestination ? NpduControlBits.DESTINATION_SPECIFIED : 0) | (requireResponse ? NpduControlBits.EXPECTING_REPLY : 0);
        
        if (hasDestination) {
            buffer.buffer[buffer.offset++] = destination.networkAddress[0]; // Network address -> 65535 when broadcast
            buffer.buffer[buffer.offset++] = destination.networkAddress[1];
            buffer.buffer[buffer.offset++] = destination.macLayerAddress.length; // Mac layer address -> zero when broadcast
            
            for (const macLayerAddressPart of destination.macLayerAddress) {
                buffer.buffer[buffer.offset++] = macLayerAddressPart;
            }

            // Set hop count
            buffer.buffer[buffer.offset++] = hopCount;
        }
    }

    public static decode(buffer: Buffer, offset: number): null | Ndpu {
        const orgOffset = offset;
        offset++;

        const funct = buffer[offset++];

        if (funct & NpduControlBits.DESTINATION_SPECIFIED) {
            const tmpDestination = this.decodeTarget(buffer, offset);
            offset += tmpDestination.length;
        }

        let macLayerAddress: number[] = [];
        let networkAddress: number[] = [];
        if (funct & NpduControlBits.SOURCE_SPECIFIED) {
            const tmpSource = this.decodeTarget(buffer, offset);
            networkAddress = tmpSource.target.net;
            macLayerAddress = tmpSource.target.adr;

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
          macLayerAddress,
          networkAddress,
        };
    }

    private static decodeTarget(buffer: Buffer, offset: number): { length: number, target: {net: number[], adr: number[]} } {
        let length = 0;
        const target: {net: number[], adr: number[]} = { net: [], adr: [] };

        // Get network address
        target.net.push(buffer[offset + length++]);
        target.net.push(buffer[offset + length++]);

        // Get Mac layer
        const adrLen = buffer[offset + length++];
        if (adrLen > 0) {
          for (let i = 0; i < adrLen; i++) {
            target.adr.push(buffer[offset + length++]);
          }
        }

        return { target, length };
      };
}