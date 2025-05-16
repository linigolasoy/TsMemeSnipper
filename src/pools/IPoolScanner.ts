import {IBasicEvent, BasicEvent} from '../config/IBasicEvent';



/***
 * Pool interface
 */
export interface IPool
{
    get PoolScanner() : IPoolScanner;

    get PoolId() : string;
    get PoolToken() : string;

    get PoolData(): unknown;
}




/**
 * Pool scanner
 */
export interface IPoolScanner
{
    get OnNewPool() : IBasicEvent<IPool>;
    


    start() : Promise<boolean>;
    stop(): Promise<boolean>;
}

