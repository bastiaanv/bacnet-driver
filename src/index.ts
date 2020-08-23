import * as dgram from 'dgram';
import { UdpTransporter, UdpTransporterSettings } from './transporter';
import Logger, { createLogger } from 'bunyan';
import { VirtualLinkControl } from './virtual.link.control';
import { BVLC_HEADER_LENGTH, BvlcResultPurpose, BUFFER_MAX_PAYLOAD, NpduControlPriority, UnconfirmedServiceChoice, NpduControlBits, PDU_TYPE_MASK, PduTypes, ConfirmedServiceChoice, ObjectType, PropertyIdentifier, PduConReqBits } from './enum';
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
import { ReadString } from './interfaces/events/readProperty/read.string';
import { ReadObject } from './interfaces/events/readProperty/read.object';

export class BacnetDriver {
    private readonly transporter: UdpTransporter;
    private readonly logger: Logger;
    private readonly options: BacnetOptions;

    // RXJS Subjects
    public readonly iAmObservable: Subject<IAmEvent> = new Subject<IAmEvent>();
    public readonly errorObservable: Subject<Error> = new Subject<Error>();

    private readonly foundDevices: FoundDevice[] = [];
    private readonly invokeStore: Array<{invokeId: number, callback(data: any): void}> = [];
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

    public readObjectList(address: string, deviceId: number): Promise<ReadObject[]> {
        return this.readProperty(address, deviceId, ObjectType.DEVICE, deviceId, PropertyIdentifier.OBJECT_LIST);
    }

    public readPresentValue(address: string, deviceId: number, objectType: number, objectInstance: number): Promise<ReadString> {
        return this.readProperty(address, deviceId, objectType, objectInstance, PropertyIdentifier.PRESENT_VALUE);
    }

    public readProperty(address: string, deviceId: number, objectType: number, objectInstance: number, propertyId: number): Promise<any> {
        const device = this.foundDevices.find((x) => x.address === address && x.deviceId === deviceId);
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
            // Encode and send read message
            ReadProperty.encode(buffer, objectType, objectInstance, propertyId, reject);
            VirtualLinkControl.encode(buffer, BvlcResultPurpose.ORIGINAL_UNICAST_NPDU);

            // Send message
            this.transporter.send(buffer, address);

            // Add callback timeout
            this.addCallback(invokeId, resolve, reject);
        });
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
        const apduType = type & PDU_TYPE_MASK;
        if (apduType === PduTypes.UNCONFIRMED_REQUEST) {
            const result = ApplicationProtocolDataUnit.decodeUnconfirmedServiceRequest(buffer);
            return this.processUnconfirmedServiceRequest(buffer, result.service, remoteAddress, msgLength - result.length, resultNdpu);
        
        } else if (apduType === PduTypes.COMPLEX_ACK) {
            const result = ApplicationProtocolDataUnit.decodeComplexAcknowledge(buffer);
            if ((type & PduConReqBits.SEGMENTED_MESSAGE) === 0) {
                return this.processConfirmedServiceRequest(buffer, result);
            
            } else {
                return this.logger.debug('Received segmented message, which is not supported yet');
            }

        } else {
            return this.logger.debug('Received unsupported PDU message');
        }
    }

    private processUnconfirmedServiceRequest(buffer: TransporterBuffer, service: number, address: string, length: number, ndpu: Ndpu) {
        if (service === UnconfirmedServiceChoice.I_AM) {
            const result = IAm.decode(buffer);
            if (!result) {
                return this.logger.debug('Received invalid iAm message');
            }

            this.foundDevices.push({
                address,
                deviceId: result.deviceId,
                macLayerAddress: ndpu.macLayerAddress,
                networkAddress: ndpu.networkAddress
            });

            this.iAmObservable.next({ address, deviceId: result.deviceId });
        
        } else {
            return this.logger.debug('Received message for unsupported service');
        }
    }

    private processConfirmedServiceRequest(buffer: TransporterBuffer, request: ComplexAcknowledge): void {
        if (request.service === ConfirmedServiceChoice.READ_PROPERTY) {
            const promise = this.invokeStore.find((x) => x.invokeId === request.invokeId);
            if (!promise) {
                return this.logger.debug('No promise found for invoke: ' + request.invokeId);
            }

            promise.callback(ReadProperty.decode(buffer));
        }
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
            reject('ERR_TIMEOUT');
        }, this.options.timeout);
        
        this.invokeStore.push({ invokeId: id, callback: (data: any) => {
            clearTimeout(timeout);
            this.invokeStore.splice(this.invokeStore.findIndex((x) => x.invokeId === id), 1);
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
