import { BacnetDriver } from '../src/index';

const bacnet = new BacnetDriver({});
bacnet.errorObservable.subscribe(console.log);
bacnet.iAmObservable.subscribe(console.log);
bacnet.whoIs();