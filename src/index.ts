import * as dgram from 'dgram';
import { UdpTransporter, UdpTransporterSettings } from './transporter';
import Logger, { createLogger } from 'bunyan';
import { VirtualLinkControl } from './virtual.link.control';
import { BVLC_HEADER_LENGTH, BvlcResultPurpose, BUFFER_MAX_PAYLOAD, NpduControlPriority, UnconfirmedServiceChoice, NpduControlBits, PDU_TYPE_MASK, PduTypes } from './enum';
import { TransporterBuffer } from './interfaces/transporter.buffer';
import { NetworkProtocolDataUnit } from './ndpu';
import { ApplicationProtocolDataUnit } from './adpu';
import { BacnetOptions } from './interfaces/bacnet.options';
import { IAm } from './services/i.am';
import { Subject } from 'rxjs';
import { IAmEvent } from './interfaces/events/i.am';

export class BacnetDriver {
    private readonly transporter: UdpTransporter;
    private readonly logger: Logger;

    // RXJS Subjects
    public readonly iAmObservable: Subject<IAmEvent> = new Subject<IAmEvent>();
    public readonly errorObservable: Subject<Error> = new Subject<Error>();

    constructor(options: BacnetOptions) {
        // Setup logger
        this.logger = createLogger({name: 'Bacnet-driver', level: options.logLevel || 'debug'});

        // Setup UDP4 transporter
        const transporterOptions: UdpTransporterSettings = {
            port: options.port || 0xBAC0,
            interface: options.interface,
        };
        this.transporter = new UdpTransporter(transporterOptions);
        this.transporter.on('message', this.receiveData.bind(this));
        this.transporter.on('error', (err: Error) => { this.errorObservable.next(err); });
        this.transporter.open();
    }

    /***
     * The whoIs command discovers all BACNET devices in a network.
     * @function bacstack.whoIs
     * @fires iAm
     */
    public whoIs(): void {
        const address = '255.255.255.255';
        const buffer = this.getBuffer();

        // Encode whoIs message
        NetworkProtocolDataUnit.encode(buffer, NpduControlPriority.NORMAL_MESSAGE, address, 255);
        ApplicationProtocolDataUnit.encodeUnconfirmedServiceRequest(buffer, UnconfirmedServiceChoice.WHO_IS);
        VirtualLinkControl.encode(buffer, BvlcResultPurpose.ORIGINAL_BROADCAST_NPDU);

        // Send message
        this.transporter.send(buffer, address);
    }

    private receiveData(buffer: Buffer, remoteInfo: dgram.RemoteInfo): void {
        // Check data length
        if (buffer.length < BVLC_HEADER_LENGTH) {
            return this.logger.debug('Received invalid data -> Drop package');
        }

        // Parse BVLC header
        const result = VirtualLinkControl.decode(buffer);
        if (!result) {
            return this.logger.debug('Received invalid BVLC header -> Drop package');
        }

        // Check BVLC function
        const validBvlcFunctions: number[] = [BvlcResultPurpose.ORIGINAL_UNICAST_NPDU, BvlcResultPurpose.ORIGINAL_BROADCAST_NPDU, BvlcResultPurpose.FORWARDED_NPDU];
        if (validBvlcFunctions.includes(result.function)) {
            const transporterBuffer: TransporterBuffer = { buffer, offset: result.length };
            return this.handleNpdu(transporterBuffer, buffer.length - result.length, remoteInfo.address);

        } else {
            return this.logger.debug('Received unknown BVLC function -> Drop package');
        }
    }

    /**
     * Decodes the NPDU and checks whether the NPDU is valid and is not a network message
     */
    private handleNpdu(buffer: TransporterBuffer, msgLength: number, remoteAddress: string): void {
        // Check data length
        if (msgLength <= 0) {
            return this.logger.debug('No NPDU data -> Drop package');
        }

        // Parse baNpdu header
        const result = NetworkProtocolDataUnit.decode(buffer.buffer, buffer.offset);
        if (!result) {
            return this.logger.debug('Received invalid NPDU header -> Drop package');
        }

        if (result.function & NpduControlBits.NETWORK_LAYER_MESSAGE) {
          return this.logger.debug('Received network layer message -> Drop package');
        }

        buffer.offset += result.length;
        msgLength -= result.length;
        if (msgLength <= 0) {
            return this.logger.debug('No APDU data -> Drop package');
        }

        const apduType = ApplicationProtocolDataUnit.getDecodedType(buffer);
        this.handlePdu(remoteAddress, apduType, buffer, msgLength);
    }

    /**
     * Processes the PDU of the message. 
     * NOTE: Only the Unconfirmed request PDU type is implemented yet.... 
     */
    private handlePdu (address: string, type: number, buffer: TransporterBuffer, length: number) {
        if (type === PduTypes.UNCONFIRMED_REQUEST) {
            const result = ApplicationProtocolDataUnit.decodeUnconfirmedServiceRequest(buffer);
            return this.processUnconfirmedServiceRequest(address, result.service, buffer, length - result.length);
        
        } else {
            return this.logger.debug('Received unsupported PDU message');
        }
    }

    private processUnconfirmedServiceRequest(address: string, service: number, buffer: TransporterBuffer, length: number) {
        if (service === UnconfirmedServiceChoice.I_AM) {
            const result = IAm.decode(buffer);
            if (!result) {
                return this.logger.debug('Received invalid iAm message');
            }

            this.iAmObservable.next({ address, deviceId: result.deviceId });
        
        } else {
            return this.logger.debug('Received message for unsupported service');
        }
    }

    private getBuffer(): TransporterBuffer {
        return {
          buffer: Buffer.alloc(BUFFER_MAX_PAYLOAD),
          offset: BVLC_HEADER_LENGTH
        };
    }
}