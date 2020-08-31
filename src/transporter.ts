import * as dgram from 'dgram';
import EventEmitter from 'events';
import { TransporterBuffer } from './interfaces/transporter.buffer';

export class UdpTransporter extends EventEmitter.EventEmitter {
    private readonly server: dgram.Socket;
    private readonly settings: UdpTransporterSettings;

    constructor(settings: UdpTransporterSettings) {
        super();

        this.settings = settings;
        this.server = dgram.createSocket({type: 'udp4', reuseAddr: true});
        this.server.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => this.emit('message', msg, rinfo.address));
        this.server.on('error', (err) => this.emit('message', err));
    }

    public send(buffer: TransporterBuffer, receiver: string): void {
        this.server.send(buffer.buffer, 0, buffer.offset, this.settings.port, receiver);
    }
    
    public open(): void {
        this.server.bind(this.settings.port, this.settings.interface, () => {
            this.server.setBroadcast(true);
        });
    }

    public close(): void {
        this.server.close();
    }
}

export interface UdpTransporterSettings {
    port: number;
    interface?: string
}