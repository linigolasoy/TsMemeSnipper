import lo from "lodash";
import { Connection, PublicKey, LogsFilter, Logs } from "@solana/web3.js";
import { struct, u8, u64, publicKey } from "@raydium-io/raydium-sdk";

import { AppConfig } from "../../config/config";
import {IPoolScanner, IBasicEvent, BasicEvent, IPool} from '../IPoolScanner'


/**
 * Radyum implementation of pool scanner
 */
export class RadyumPoolScanner implements IPoolScanner
{
    private readonly onPoolCreation : BasicEvent<IPool> = new BasicEvent<IPool>();
    private readonly RADYUM_PROGRAM_ID : string = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
    private m_oBackPromise : Promise<undefined> | undefined = undefined;
    private m_bCancel : boolean = false;
    private m_oConnection : Connection | undefined = undefined;
    private static m_nLogs : number = 0;
    private readonly LOG_COUNT_INTERVAL : number = 500;

    private m_nSubsId : number = -1;

    private static LOG_TYPE = struct([u8("log_type")]);
    private static RAY_IX_TYPE = {
        CREATE_POOL: 0,
        ADD_LIQUIDITY: 1,
        BURN_LIQUIDITY: 2,
        SWAP: 3,
      };
    
    constructor()
    {

    }


    public get OnNewPool() : IBasicEvent<IPool> { return this.onPoolCreation.expose(); }




    private static async evalPool(oThis: RadyumPoolScanner, strSignature : string): Promise<IPool | undefined>
    {

        if( oThis.m_oConnection == undefined ) return undefined;

        const oTx = await oThis.m_oConnection.getParsedTransaction(strSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        })

        return {};
    }


    // Radyum log evaluator
    private static async onLog( oThis : RadyumPoolScanner,  oLog: Logs ): Promise<void>
    {
        if( oLog.err != undefined || oLog.err != null  ) return;

        const ray_log = lo.find(oLog.logs, (y) => y.includes("ray_log"));
        if( ray_log == undefined && ray_log == null ) return;

        const match = ray_log.match(/ray_log: (.*)/)

        if (match == undefined || match?.length <= 0 ) return;

        RadyumPoolScanner.m_nLogs++;
        const ray_data = Buffer.from(
                match[1],
                "base64"
            );

        if( RadyumPoolScanner.m_nLogs % oThis.LOG_COUNT_INTERVAL == 0 )
        {
            AppConfig.Logger.info(`Log Count ${RadyumPoolScanner.m_nLogs}`)
        }

        const log_type = RadyumPoolScanner.LOG_TYPE.decode(ray_data).log_type;
        if (log_type == RadyumPoolScanner.RAY_IX_TYPE.CREATE_POOL) 
        {
            AppConfig.Logger.info(`>>>>> POOL CREATED ON TX : [${oLog.signature}]`);
            const oPool : IPool | undefined = await RadyumPoolScanner.evalPool(oThis, oLog.signature);
            if( oPool == undefined ) return;
            oThis.onPoolCreation.trigger(oPool);
        }

    }

    // main loop
    private async mainLoop(): Promise<undefined>
    {
        AppConfig.Logger.info("Radyum main loop started");
        var nLogs : number = 0;
        if( this.m_oConnection == undefined ) return;
        
        const oRadyumProgram : PublicKey = new PublicKey(this.RADYUM_PROGRAM_ID);

        const oClass : RadyumPoolScanner = this;

        this.m_nSubsId = await this.m_oConnection.onLogs( oRadyumProgram, async (oLog) => {
            await RadyumPoolScanner.onLog(oClass, oLog);
        });

        while( !this.m_bCancel )
        {
            await AppConfig.sleep(1000);
        }
        
        AppConfig.Logger.info("Radyum main loop ended");
    }

    // Start bot 
    public async start() : Promise<boolean>
    {
        const bStopped : boolean = await this.stop();
        if( !bStopped ) return false;
        if( AppConfig.RpcUrl == undefined ) return false;

        this.m_bCancel = false;
        this.m_oConnection = new Connection(AppConfig.RpcUrl, { wsEndpoint: AppConfig.WssUrl });
        this.m_oBackPromise = this.mainLoop();
        return true;
    }


    // End bot
    public async stop(): Promise<boolean>
    {
        this.m_bCancel = true;
        if( this.m_oBackPromise != undefined )
        {
            await this.m_oBackPromise;
        }
        if( this.m_oConnection != undefined && this.m_nSubsId >= 0 )
        {
            await this.m_oConnection.removeOnLogsListener(this.m_nSubsId);
            this.m_nSubsId = -1;
        }

        return true;
    }

}