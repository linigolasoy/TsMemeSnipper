import lo from "lodash";
import { Connection, PublicKey, LogsFilter, Logs } from "@solana/web3.js";
import { struct, u8, LIQUIDITY_STATE_LAYOUT_V4, u64, publicKey } from "@raydium-io/raydium-sdk";

import { AppConfig } from "../../config/config";
import {IBasicEvent, BasicEvent} from '../../config/IBasicEvent';
import {IPoolScanner,IPool} from '../IPoolScanner'
import {TokenCheck} from '../../tokens/tockenChecks';
import { RadyumPool } from "./RadyumPool";

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
    private static SOL_ADDRESS = new PublicKey("So11111111111111111111111111111111111111112");


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

        try
        {
            if( oThis.m_oConnection == undefined ) return undefined;

            const oTx = await oThis.m_oConnection.getParsedTransaction(strSignature, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
            })
            if( oTx == null || oTx.meta == null ) return undefined;

            const innerInstructions = oTx.meta.innerInstructions
            const postTokenBalances = oTx.meta.postTokenBalances
            let baseMint: string = ''
            let poolId: string = ''
            let solAmount: number = 0
            innerInstructions?.map((mt: any) => {
                    mt.instructions.map((item: any) => {
                        // @ts-ignore
                        if (item.parsed?.type == "initializeAccount" && item.parsed?.info.mint.toString() != RadyumPoolScanner.SOL_ADDRESS.toString()) {
                        // @ts-ignore
                        baseMint = item.parsed?.info.mint.toString()
                    }
                    // @ts-ignore
                    if (item.parsed?.type == "allocate" && item.parsed?.info.space == 752) {
                        // @ts-ignore
                        poolId = item.parsed?.info.account.toString()
                    }
                })
            });

            postTokenBalances?.map((balance: any) => {
                if (balance.mint == RadyumPoolScanner.SOL_ADDRESS.toString() && balance.owner == "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1" && balance.programId == "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") solAmount = balance.uiTokenAmount.uiAmount
            })
    
            if (!baseMint || !poolId || !solAmount) return

            // Pool found and solana amount
            AppConfig.Logger.info(`Found Pool Address [${poolId}] Token Mint [${baseMint}] SOL Amount [${solAmount.toString()}`);

            if (solAmount > AppConfig.MaxPoolAmount || solAmount < AppConfig.MinPoolAmount) {
                AppConfig.Logger.info('   Pool size of range');
                return
            }

            // Get pool info
            const oPoolAccountInfo = await oThis.m_oConnection.getAccountInfo(new PublicKey(poolId))
            if( oPoolAccountInfo == undefined || oPoolAccountInfo == null ) return undefined;

            const oPoolState = LIQUIDITY_STATE_LAYOUT_V4.decode(oPoolAccountInfo.data)


            if( AppConfig.PoolMintRenounceCheck || AppConfig.PoolMintBurnedCheck || AppConfig.PoolMintFrozenCheck)
            {

                const oStatus = await TokenCheck.GetTokenStatus(oThis.m_oConnection, new PublicKey(baseMint), oPoolState.lpMint);
                if( oStatus == undefined ) return undefined;

                if( AppConfig.PoolMintRenounceCheck && !oStatus.MintRenounced )
                {
                    AppConfig.Logger.warn('   Skipping...Pool mint not renounced');
                    return undefined;
                }

                if( AppConfig.PoolMintBurnedCheck && !oStatus.Burned )
                {
                    AppConfig.Logger.warn('   Skipping...Token not burned');
                    return undefined;
                }
    
                if( AppConfig.PoolMintFrozenCheck && !oStatus.Freezed )
                {
                    AppConfig.Logger.warn('   Skipping...Pool mint not freezed');
                    return undefined;
                }
            }   

            const oResult = await RadyumPool.create(oThis, oThis.m_oConnection,  poolId, baseMint);
            if( oResult == undefined ) return undefined;

            return oResult;
            /*
    
                if (running) saveNewPool(poolId.toString(), baseMint.toString())
                const poolKeys = jsonInfo2PoolKeys(await formatAmmKeysById(poolId.toString())) as LiquidityPoolKeys
                if (autoBuy && !processingToken) {
                    processingToken = true
                    console.log('buying processingToken', processingToken)
                    await buy(new PublicKey(poolId), new PublicKey(baseMint), poolKeys)
                }
            }
            */  
        }
        catch(e)
        {
            AppConfig.Logger.error("Error getting pool info", e);
        }
    }


    // Radyum log evaluator
    private static async onLog( oThis : RadyumPoolScanner,  oLog: Logs ): Promise<void>
    {
        if( oLog.err != undefined || oLog.err != null  ) return;

        const ray_log = lo.find(oLog.logs, (y) => y.includes("ray_log"));
        if( ray_log == undefined || ray_log == null ) return;

        const match = ray_log.match(/ray_log: (.*)/)

        if (match == undefined || match == null || match?.length <= 0 ) return;

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