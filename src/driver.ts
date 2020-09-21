import { UdpTransporter, UdpTransporterSettings } from './transporter';
import Logger, { createLogger } from 'bunyan';
import { VirtualLinkControl } from './virtual.link.control';
import { BVLC_HEADER_LENGTH, BvlcResultPurpose, BUFFER_MAX_PAYLOAD, NpduControlPriority, UnconfirmedServiceChoice, NpduControlBits, PDU_TYPE_MASK, PduTypes, ConfirmedServiceChoice, ObjectType, PropertyIdentifier, PduConReqBits, PduSegAckBits } from './enum';
import { TransporterBuffer } from './interfaces/transporter.buffer';
import { NetworkProtocolDataUnit } from './ndpu';
import { ApplicationProtocolDataUnit } from './apdu';
import { BacnetOptions } from './interfaces/bacnet.options';
import { IAm } from './services/i.am';
import { Subject } from 'rxjs';
import { IAmEvent } from './interfaces/events/i.am';
import { NpduDestination } from './interfaces/ndpu/destination';
import { FoundDevice } from './interfaces/found.device';
import { Ndpu } from './interfaces/ndpu/ndpu';
import { ReadProperty } from './services/read.property';
import { ComplexAcknowledge } from './interfaces/apdu/complex.acknowledge';
import { WriteProperty } from './services/write.property';
import { SimpleAcknowledge } from './interfaces/apdu/simple.acknowledge';
import { ErrorService } from './services/error';
import { ReadPropertyOptions } from './interfaces/events/readProperty/read.property.options';
import { WritePropertyOptions } from './interfaces/events/writeProperty/write.property.options';

export class BacnetDriver {
    private readonly transporter: UdpTransporter;
    private readonly logger: Logger;
    private readonly options: BacnetOptions;

    // RXJS Subjects
    public readonly iAmObservable: Subject<IAmEvent> = new Subject<IAmEvent>();
    public readonly errorObservable: Subject<Error> = new Subject<Error>();

    private readonly foundDevices: FoundDevice[] = [];
    private readonly invokeStore: Array<{invokeId: number, callback(data?: any, err?: any): void}> = [];
    private readonly segmentStore: Array<{invokeId: number, lastNumber: number, store: Array<Buffer>}> = [];
    private invokeId: number = 0;

    constructor(options: BacnetOptions) {
        options.timeout = options.timeout || 3000;
        this.options = options;

        // Setup logger
        this.logger = createLogger({name: 'Bacnet-driver', level: options.logLevel || 'info'});

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
        const destination: NpduDestination = {
            networkAddress: [0xFF, 0xFF],
            macLayerAddress: [],
        };
        const buffer = this.getBuffer();

        // Encode whoIs message
        NetworkProtocolDataUnit.encode(buffer, NpduControlPriority.NORMAL_MESSAGE, destination, 255, false);
        ApplicationProtocolDataUnit.encodeUnconfirmedServiceRequest(buffer, UnconfirmedServiceChoice.WHO_IS);
        VirtualLinkControl.encode(buffer, BvlcResultPurpose.ORIGINAL_BROADCAST_NPDU);

        // Send message
        this.transporter.send(buffer, '255.255.255.255');
    }

    public readProperty(options: ReadPropertyOptions): Promise<any> {
        const device = this.foundDevices.find((x) => x.address === options.address && x.deviceId === options.deviceId);
        const destination: NpduDestination = {
            networkAddress: device!.networkAddress,
            macLayerAddress: device!.macLayerAddress,
        };
        const buffer = this.getBuffer();
        const invokeId = this.getInvokeId();

        // Encode bacnet message
        NetworkProtocolDataUnit.encode(buffer, NpduControlPriority.NORMAL_MESSAGE, destination, 255, true);
        ApplicationProtocolDataUnit.encodeConfirmedServiceRequest(buffer, ConfirmedServiceChoice.READ_PROPERTY, invokeId, 0, 0, true);

        return new Promise<void>((resolve, reject) => {
            // Encode message
            ReadProperty.encode(buffer, options.objectType, options.objectInstance, options.propertyId, reject);
            VirtualLinkControl.encode(buffer, BvlcResultPurpose.ORIGINAL_UNICAST_NPDU);

            // Send message
            this.transporter.send(buffer, options.address);

            // Add callback timeout
            this.addCallback(invokeId, resolve, reject);
        });
    }

    public writeProperty(options: WritePropertyOptions): Promise<void> {
        const device = this.foundDevices.find((x) => x.address === options.address && x.deviceId === options.deviceId);
        const destination: NpduDestination = {
            networkAddress: device!.networkAddress,
            macLayerAddress: device!.macLayerAddress,
        };
        const buffer = this.getBuffer();
        const invokeId = this.getInvokeId();

        // Encode bacnet message
        NetworkProtocolDataUnit.encode(buffer, NpduControlPriority.NORMAL_MESSAGE, destination, 255, true);
        ApplicationProtocolDataUnit.encodeConfirmedServiceRequest(buffer, ConfirmedServiceChoice.WRITE_PROPERTY, invokeId, 0, 0, true);

        return new Promise<any>((resolve, reject) => {
            // Encode message
            WriteProperty.encode(buffer, options.objectType, options.objectInstance, options.propertyId, options.values, reject);
            VirtualLinkControl.encode(buffer, BvlcResultPurpose.ORIGINAL_UNICAST_NPDU);

            // Send message
            this.transporter.send(buffer, options.address);

            // Add callback timeout
            this.addCallback(invokeId, resolve, reject);
        });
    }

    private receiveData(buffer: Buffer, address: string): void {
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
            return this.handleNpdu(transporterBuffer, buffer.length - result.length, address);

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
        const resultNdpu = NetworkProtocolDataUnit.decode(buffer.buffer, buffer.offset);
        if (!resultNdpu) {
            return this.logger.debug('Received invalid NPDU header -> Drop package');
        }

        if (resultNdpu.function & NpduControlBits.NETWORK_LAYER_MESSAGE) {
          return this.logger.debug('Received network layer message -> Drop package');
        }

        buffer.offset += resultNdpu.length;
        msgLength -= resultNdpu.length;
        if (msgLength <= 0) {
            return this.logger.debug('No APDU data -> Drop package');
        }

        const type = ApplicationProtocolDataUnit.getDecodedType(buffer);
        return this.handlePdu(buffer, remoteAddress, msgLength, resultNdpu, type);
    }

    private handlePdu(buffer: TransporterBuffer, remoteAddress: string, msgLength: number, resultNdpu: Ndpu, type: number) {
        const apduType = type & PDU_TYPE_MASK;
        if (apduType === PduTypes.UNCONFIRMED_REQUEST) {
            const result = ApplicationProtocolDataUnit.decodeUnconfirmedServiceRequest(buffer);
            return this.processUnconfirmedServiceRequest(buffer, result.service, remoteAddress, msgLength - result.length, resultNdpu);
        
        } else if (apduType === PduTypes.COMPLEX_ACK) {
            const result = ApplicationProtocolDataUnit.decodeComplexAcknowledge(buffer);
            if ((type & PduConReqBits.SEGMENTED_MESSAGE) === 0) {
                return this.processComplexServiceRequest(buffer, result);
            
            } else {
                return this.processSegment(remoteAddress, result.type, result.service, result.invokeId, result.sequencenumber, result.proposedWindowNumber, buffer, msgLength, resultNdpu);
            }

        } else if (apduType === PduTypes.SIMPLE_ACK) {
            const result = ApplicationProtocolDataUnit.decodeSimpleAcknowledge(buffer);
            return this.processSimpleServiceRequest(buffer, result);
            
        } else if (apduType === PduTypes.ERROR) {
            const result = ApplicationProtocolDataUnit.decodeSimpleAcknowledge(buffer);
            return this.processError(buffer, result);

        } else {
            return this.logger.debug('Received unsupported PDU message -> Drop package');
        }
    }

    private processSegment(receiver: string, type: number, service: number, invokeId: number, sequencenumber: number, proposedWindowNumber: number, buffer: TransporterBuffer, length: number, ndpu: Ndpu): void {
        let first = false;
        let lastSequenceIndex = this.segmentStore.findIndex(x => x.invokeId === invokeId);
        if (sequencenumber === 0 && lastSequenceIndex === -1) {
          first = true;
          this.segmentStore.push({invokeId, lastNumber: 0, store: []});
          lastSequenceIndex = this.segmentStore.length - 1;
        } else {
          if (sequencenumber !== this.segmentStore[lastSequenceIndex].lastNumber + 1) {
              this.logger.debug('Received wrong package -> Requesting correct one');
              return this.segmentAckResponse(receiver, true, invokeId, this.segmentStore[lastSequenceIndex].lastNumber, proposedWindowNumber, ndpu);
          }
        }
        
        this.segmentStore[lastSequenceIndex].lastNumber = sequencenumber;
        const moreFollows = (type & PduConReqBits.MORE_FOLLOWS) > 0;
        if ((sequencenumber % proposedWindowNumber) === 0 || !moreFollows) {
            this.segmentAckResponse(receiver, false, invokeId, this.segmentStore[lastSequenceIndex].lastNumber, proposedWindowNumber, ndpu);
        }

        this.performDefaultSegmentHandling(lastSequenceIndex, receiver, type, service, invokeId, first, moreFollows, buffer, length, ndpu, proposedWindowNumber);
      }

      private segmentAckResponse(receiver: string, negative: boolean, originalInvokeId: number, sequencenumber: number, actualWindowSize: number, ndpu: Ndpu): void {
        const buffer = this.getBuffer();
        NetworkProtocolDataUnit.encode(buffer, NpduControlPriority.NORMAL_MESSAGE, {macLayerAddress: ndpu.macLayerAddress, networkAddress: ndpu.networkAddress}, 0xFF, false);
        ApplicationProtocolDataUnit.encodeSegmentAck(buffer, PduTypes.SEGMENT_ACK | (negative ? PduSegAckBits.NEGATIVE_ACK : 0) | 0, originalInvokeId, sequencenumber, actualWindowSize);
        VirtualLinkControl.encode(buffer, BvlcResultPurpose.ORIGINAL_UNICAST_NPDU);
        this.transporter.send(buffer, receiver);
      }

      private performDefaultSegmentHandling(segmentIndex: number, adr: string, type: number, service: number, invokeId: number, first: boolean, moreFollows: boolean, buffer: TransporterBuffer, length: number, ndpu: Ndpu, proposedWindowNumber: number) {
        if (first) {
            type &= ~PduConReqBits.SEGMENTED_MESSAGE;
            let apduHeaderLen = 3;
            if ((type & PDU_TYPE_MASK) === PduTypes.CONFIRMED_REQUEST) {
                apduHeaderLen = 4;
            }
            
            const apdubuffer = this.getBuffer();
            apdubuffer.offset = 0;
            buffer.buffer.copy(apdubuffer.buffer, apduHeaderLen, buffer.offset, buffer.offset + length);

            if ((type & PDU_TYPE_MASK) === PduTypes.CONFIRMED_REQUEST) {
                ApplicationProtocolDataUnit.encodeConfirmedServiceRequest(apdubuffer, service, invokeId, this.segmentStore[segmentIndex].lastNumber, proposedWindowNumber, true);
            } else {
            ApplicationProtocolDataUnit.encodeComplexAck(apdubuffer, type, service, invokeId, 0, 0);
            }

            this.segmentStore[segmentIndex].store.push(apdubuffer.buffer.slice(0, length + apduHeaderLen));
        } else {
            this.segmentStore[segmentIndex].store.push(buffer.buffer.slice(buffer.offset, buffer.offset + length));
        }

        if (!moreFollows) {
            const apduBuffer = { buffer: Buffer.concat(this.segmentStore[segmentIndex].store), offset: 0 };
            this.segmentStore.splice(segmentIndex, 1);
            type &= ~PduConReqBits.SEGMENTED_MESSAGE;
            this.handlePdu(apduBuffer, adr, length, ndpu, type);
        }
      }

    private processUnconfirmedServiceRequest(buffer: TransporterBuffer, service: number, address: string, length: number, ndpu: Ndpu) {
        if (service === UnconfirmedServiceChoice.I_AM) {
            const result = IAm.decode(buffer);
            if (!result) {
                return this.logger.debug('Received invalid iAm message -> Drop package');
            }

            this.foundDevices.push({
                address,
                deviceId: result.deviceId,
                macLayerAddress: ndpu.macLayerAddress,
                networkAddress: ndpu.networkAddress
            });

            this.iAmObservable.next({ address, deviceId: result.deviceId });
        
        } else {
            return this.logger.debug('UNCONFIRMED_SERVICES: Received message for unsupported service -> Drop package');
        }
    }

    private processComplexServiceRequest(buffer: TransporterBuffer, request: ComplexAcknowledge): void {
        if (request.service === ConfirmedServiceChoice.READ_PROPERTY) {
            const promise = this.invokeStore.find((x) => x.invokeId === request.invokeId);
            if (!promise) {
                return this.logger.debug('CONFIRMED_COMPLEX_SERVICES: No promise found for invoke: ' + request.invokeId + ' -> Drop package');
            }

            promise.callback(ReadProperty.decode(buffer));

        } else {
            return this.logger.debug('CONFIRMED_COMPLEX_SERVICES: Received message for unsupported service -> Drop package');
        }
    }

    private processSimpleServiceRequest(buffer: TransporterBuffer, request: SimpleAcknowledge): void {
        if (request.service === ConfirmedServiceChoice.WRITE_PROPERTY) {
            const promise = this.invokeStore.find((x) => x.invokeId === request.invokeId);
            if (!promise) {
                return this.logger.debug('CONFIRMED_SIMPLE_SERVICES: No promise found for invoke: ' + request.invokeId + ' -> Drop package');
            }

            promise.callback();

        } else {
            return this.logger.debug('CONFIRMED_SIMPLE_SERVICES: Received message for unsupported service -> Drop package');
        }
    }

    private processError(buffer: TransporterBuffer, request: SimpleAcknowledge): void {
        const promise = this.invokeStore.find((x) => x.invokeId === request.invokeId);
        if (!promise) {
            return this.logger.debug('PROCESS_ERROR: No promise found for invoke: ' + request.invokeId + ' -> Drop package');
        }

        promise.callback(null, ErrorService.decode(buffer));
    }

    private getBuffer(): TransporterBuffer {
        return {
          buffer: Buffer.alloc(BUFFER_MAX_PAYLOAD),
          offset: BVLC_HEADER_LENGTH
        };
    }

    private addCallback(id: number, resolve: (data: any) => void, reject: (message: string) => void) {
        const timeout = setTimeout(() => {
            this.invokeStore.splice(this.invokeStore.findIndex((x) => x.invokeId === id), 1);
            const segmentIndex = this.segmentStore.findIndex(x => x.invokeId === id);
            if (segmentIndex !== -1) {
                this.segmentStore.splice(segmentIndex, 1);
            }

            reject('ERR_TIMEOUT: ' + id);
        }, this.options.timeout);
        
        this.invokeStore.push({ invokeId: id, callback: (data?: any, err?: any) => {
            clearTimeout(timeout);
            this.invokeStore.splice(this.invokeStore.findIndex((x) => x.invokeId === id), 1);
            
            if (err) {
                reject(err);
            }

            resolve(data);
        }});
    }

    private getInvokeId() {
        if (this.invokeId > 255) {
            this.invokeId = 1;
        }
        return this.invokeId++;
    }
}