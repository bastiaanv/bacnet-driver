import { NpduDestination } from './destination';

export interface Ndpu extends NpduDestination {
    length: number;
    function: number;
}
