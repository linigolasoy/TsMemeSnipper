import bs58 from 'bs58'
import { Keypair, PublicKey } from "@solana/web3.js";
import { ITrader, IWallet } from "./ITrader";
import { RadyumTrader } from "./Radyum/RadyumTrader";




/***
 * Basic wallet implementation
 */
class BaseWallet implements IWallet 
{
    private m_oKeyPair : Keypair;
    constructor( strPrivate: string )
    {
        let decodedSecretKey: Uint8Array;

        decodedSecretKey = bs58.decode(strPrivate);
        this.m_oKeyPair = Keypair.fromSecretKey(decodedSecretKey);
    }

    public get Address(): PublicKey
    {
        return this.m_oKeyPair.publicKey;
    }

    public get Signer(): Keypair
    {
        return this.m_oKeyPair;
    }

}

/***
 * Pool factory
 */
export abstract class TradeFactory
{

    public static createRadyumTrader( oWallet: IWallet) : ITrader
    {
        return new RadyumTrader(oWallet);
    }


    public static createWallet( strPrivate: string ): IWallet
    {
        return new BaseWallet(strPrivate);
    }
}
