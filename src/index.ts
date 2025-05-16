// import lo from "lodash";
// import { Connection, PublicKey, LogsFilter } from "@solana/web3.js";
// import { struct, u8, u64, publicKey } from "@raydium-io/raydium-sdk";


import { AppConfig } from "./config/config";
import { IPool, IPoolScanner } from './pools/IPoolScanner';
import { PoolFactory } from './pools/poolFactory'



AppConfig.load();


// export const LOG_TYPE = struct([u8("log_type")]);
// export const RAY_IX_TYPE = {
//     CREATE_POOL: 0,
//     ADD_LIQUIDITY: 1,
//     BURN_LIQUIDITY: 2,
//     SWAP: 3,
//   };





const main = async() => {

    const oScanner : IPoolScanner = PoolFactory.createRadyumScanner();

    AppConfig.Logger.info("App starting...");

    oScanner.OnNewPool.on( async (oPool : IPool | undefined) => 
    {
        if( oPool == undefined ) return;
        AppConfig.Logger.info(`New pool Id [${oPool.PoolId}] Token [${oPool.PoolToken}]`);
    });
    await oScanner.start();
    var bExit : boolean = false;


    while( !bExit )
    {
        await AppConfig.sleep(2000);

    }


    await oScanner.stop();

    /*
    if( AppConfig.RpcUrl == undefined ) return;

    const oConnection = new Connection(AppConfig.RpcUrl, { wsEndpoint: AppConfig.WssUrl });

    // const oWallet = new PublicKey("BEMZ2yGTwLfxb1tmWHJzURaDSwobp5L6Z6JKMATMyYK3");
    // const oBalance = await oConnection.getBalance(oWallet)

    // const oSlot = await oConnection.getSlot("confirmed");
    
    var nLogs : number = 0;
    const oRadyumProgram = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
    const oSubsId = await oConnection.onLogs( oRadyumProgram, (oLog) => {

        if( oLog.err == undefined || oLog.err == null  )
        {
            const ray_log = lo.find(oLog.logs, (y) => y.includes("ray_log"));
            if( ray_log != undefined && ray_log != null )
            {

                
                const match = ray_log.match(/ray_log: (.*)/)

                if (match != undefined && match?.length > 0 ) 
                {
                    nLogs++;
                    const ray_data = Buffer.from(
                        match[1],
                        "base64"
                    );

                    if( nLogs % 250 == 0 )
                    {
                        AppConfig.Logger.info(`Log Count ${nLogs}`)
                    }

                    const log_type = LOG_TYPE.decode(ray_data).log_type;
                    if (log_type == RAY_IX_TYPE.CREATE_POOL) {
                        AppConfig.Logger.info(`>>>>> POOL CREATED ON TX : [${oLog.signature}]`);
                        // console.log(oLog);
                        // console.log(match);
                        //     processRaydiumPool(signature)
                    }
                }
                

            }
        }



    });
    
    // Send a request.
    // 2KaxgGdjhDGfzFTzhUVXwqDjoXDexEfHoMk31sXYXJoHXfYeQMmCpjuUdo9UjtVVLGcbSbC4yfowcimnZe22FdXF
    await AppConfig.sleep(10000); //Wait 10 seconds for Socket Testing
    await oConnection.removeOnLogsListener(oSubsId);
    await AppConfig.sleep(1000);
    AppConfig.Logger.info("App ended...");
    */

}


main();

