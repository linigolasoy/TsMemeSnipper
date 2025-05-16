import { Keypair, PublicKey } from '@solana/web3.js';
import {IBasicEvent, BasicEvent} from '../config/IBasicEvent';
import { IPool } from '../pools/IPoolScanner';




export interface IPosition 
{

}

export interface IWallet 
{
    get Address(): PublicKey;

    get Signer(): Keypair;


}


export interface ITrader 
{
    get Wallet(): IWallet;

    get Positions() : IPosition[];

    get OnTrade() : IBasicEvent<IPosition>;

    start() : Promise<boolean>;

    stop(): Promise<boolean>;

    actOnPool( oPool: IPool ) : Promise<boolean>;
}