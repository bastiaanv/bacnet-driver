import { BVLL_TYPE_BACNET_IP, BvlcResultPurpose, BVLC_HEADER_LENGTH } from './enum';
import { TransporterBuffer } from './interfaces/transporter.buffer';

export class VirtualLinkControl {
    public static encode(buffer: TransporterBuffer, func: any): void {
        buffer.buffer[0] = BVLL_TYPE_BACNET_IP;
        buffer.buffer[1] = func;
        buffer.buffer[2] = (buffer.offset & 0xFF00) >> 8;
        buffer.buffer[3] = (buffer.offset & 0x00FF) >> 0;
    };
      
    public static decode(buffer: Buffer): null | { length: number, function: number, } {
        const func = buffer[1];
        const msgLength = (buffer[2] << 8) | (buffer[3] << 0);
        if (buffer[0] !== BVLL_TYPE_BACNET_IP || buffer.length !== msgLength) {
            return null;
        }

        switch (func) {
          case BvlcResultPurpose.BVLC_RESULT:
          case BvlcResultPurpose.ORIGINAL_UNICAST_NPDU:
          case BvlcResultPurpose.ORIGINAL_BROADCAST_NPDU:
          case BvlcResultPurpose.DISTRIBUTE_BROADCAST_TO_NETWORK:
            return { length: 4, function: func };

          case BvlcResultPurpose.FORWARDED_NPDU:
            return { length: 10, function: func };

          case BvlcResultPurpose.REGISTER_FOREIGN_DEVICE:
          case BvlcResultPurpose.READ_FOREIGN_DEVICE_TABLE:
          case BvlcResultPurpose.DELETE_FOREIGN_DEVICE_TABLE_ENTRY:
          case BvlcResultPurpose.READ_BROADCAST_DISTRIBUTION_TABLE:
          case BvlcResultPurpose.WRITE_BROADCAST_DISTRIBUTION_TABLE:
          case BvlcResultPurpose.READ_BROADCAST_DISTRIBUTION_TABLE_ACK:
          case BvlcResultPurpose.READ_FOREIGN_DEVICE_TABLE_ACK:
          case BvlcResultPurpose.SECURE_BVLL:
            return null;
          default:
            return null;
        }
    }
}
