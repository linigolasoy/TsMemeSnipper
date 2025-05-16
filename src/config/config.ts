
import 'dotenv/config'
import {ILogger} from './ILogger'
// import {CategoryProvider, Category} from "typescript-logging-category-style";
// import { LogLevel } from 'typescript-logging';

import { Logger, ILogObj } from "tslog";


/***
 * Logger implementation
 */
class BaseLogger extends Logger<ILogObj> implements ILogger
{
    // private m_oLogger : Logger<ILogObj> | undefined;
    constructor()
    {
        super();
        // const oProvider = CategoryProvider.createProvider("MainLogger");
        // this.m_oLogger =  new Logger();
    }

    /*
    public info( strMessage : string ): void
    {
        this.m_oLogger?.info( strMessage);
        // console.log(strMessage);
    }


    public debug( strMessage : string ): void
    {
        this.m_oLogger?.debug(strMessage);
        // console.log(strMessage);
    }

    public warning( strMessage: string ): void
    {
        this.m_oLogger?.warn(strMessage);
        // console.warn(strMessage);
    }
    
    public error( strMessage: string, e : Error | undefined = undefined): void
    {
        this.m_oLogger?.error(strMessage);
        //console.error(strMessage);
    }
    */
}


/***
 * Config class
 */
export abstract class AppConfig
{

    public static RpcUrl : string | undefined;
    public static WssUrl : string | undefined;

    public static Logger: ILogger;

    public static load(): boolean
    {
        this.RpcUrl = process.env.RPC_URL;
        this.WssUrl = process.env.WSS_URL;

        this.Logger = new BaseLogger();
        return true;
    }
}