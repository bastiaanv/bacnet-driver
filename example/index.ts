import { BacnetDriverExtended } from '../src/index';

const bacnet = new BacnetDriverExtended({});
bacnet.errorObservable.subscribe(console.log);
bacnet.iAmObservable.subscribe(console.log);
bacnet.whoIs();