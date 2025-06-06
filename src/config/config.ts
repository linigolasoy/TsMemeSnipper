
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
        this.settings.prettyLogTimeZone = 'local';
    }

}


/***
 * Config class
 */
export abstract class AppConfig
{

    public static RpcUrl : string | undefined;
    public static WssUrl : string | undefined;
    public static PrivateKey: string;
    public static MinPoolAmount : number = 1;
    public static MaxPoolAmount : number = 300;
    public static PoolMintRenounceCheck : boolean = true;
    public static PoolMintFrozenCheck   : boolean = true;
    public static PoolMintBurnedCheck   : boolean = false;
    public static SolAmount : number = 0.01;

    public static Logger: ILogger;

    public static sleep(ms:number): Promise<unknown>
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public static load(): boolean
    {
        this.RpcUrl = process.env.RPC_URL;
        this.WssUrl = process.env.WSS_URL;
        this.PrivateKey = (process.env.PRIVATE_KEY == undefined ? "": process.env.PRIVATE_KEY);
        this.Logger = new BaseLogger();

        if( process.env.SOL_AMOUNT != undefined )
        {
            this.SolAmount = Number(process.env.SOL_AMOUNT);
        }
        
        return true;
    }
}