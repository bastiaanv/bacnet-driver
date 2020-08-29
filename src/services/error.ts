import { TransporterBuffer } from '../interfaces/transporter.buffer';
import { ErrorMessage } from '../interfaces/events/error/error.message';

export class ErrorService {
    public static decode(buffer: TransporterBuffer): ErrorMessage {
        buffer.offset++;
        const classCode = buffer.buffer[buffer.offset++];

        buffer.offset++;
        const code = buffer.buffer[buffer.offset++];

        return { class: classCode, code }
    }
}