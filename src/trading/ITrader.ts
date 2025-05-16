import { Keypair, PublicKey } from '@solana/web3.js';
import {IBasicEvent, BasicEvent} from '../config/IBasicEvent';
import { IPool } from '../pools/IPoolScanner';



/**
 * Position representation
 */
export interface IPosition 
{
    get DateOpen(): Date;
    get DateClose(): Date;
    get Pool(): IPool;

    get Trader(): ITrader;

    get BaseAmount(): number;
    get QuoteAmount(): number;

    get PriceOpen(): number;
    get PriceClose(): number;

    get Closed(): boolean;
    set Closed( bClose: boolean );
}

/**
 * Wallet representation
 */
export interface IWallet 
{
    get Address(): PublicKey;

    get Signer(): Keypair;


}


/**
 * Trading interface
 */
export interface ITrader 
{
    get Wallet(): IWallet;

    get Positions() : IPosition[];

    get OnTrade() : IBasicEvent<IPosition>;

    start() : Promise<boolean>;

    stop(): Promise<boolean>;

    actOnPool( oPool: IPool ) : Promise<boolean>;

    step(): Promise<void>;
}