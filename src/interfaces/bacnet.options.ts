import { LogLevel } from 'bunyan';

export interface BacnetOptions {
    port?: number;
    interface?: string;
    logLevel?: LogLevel;
    timeout?: number;
}
