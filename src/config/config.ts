
import 'dotenv/config'
import { Logger, ILogObj } from "tslog";
import {ILogger} from './ILogger'


/***
 * Logger implementation
 */
class BaseLogger extends Logger<ILogObj> implements ILogger
{
    // private m_oLogger : Logger<ILogObj> | undefined;
    constructor()
    {
        super();
    }

}


/***
 * Config class
 */
export abstract class AppConfig
{

    public static RpcUrl : string | undefined;
    public static WssUrl : string | undefined;

    public static MinPoolAmount : number = 5;
    public static MaxPoolAmount : number = 200;
    public static PoolMintRenounceCheck : boolean = true;
    public static PoolMintFrozenCheck   : boolean = true;
    public static PoolMintBurnedCheck   : boolean = false;

    public static Logger: ILogger;

    public static sleep(ms:number): Promise<unknown>
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public static load(): boolean
    {
        this.RpcUrl = process.env.RPC_URL;
        this.WssUrl = process.env.WSS_URL;

        this.Logger = new BaseLogger();
        return true;
    }
}