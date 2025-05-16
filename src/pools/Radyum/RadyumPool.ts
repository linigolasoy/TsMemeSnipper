import { Connection, AccountInfo, PublicKey } from "@solana/web3.js";
import 
    { 
        LIQUIDITY_STATE_LAYOUT_V4, Liquidity, MARKET_STATE_LAYOUT_V3, Market, SPL_MINT_LAYOUT, 
        LOOKUP_TABLE_CACHE, ApiPoolInfoV4, InnerSimpleV0Transaction, LiquidityPoolKeys, Percent, SPL_ACCOUNT_LAYOUT, 
        Token, TokenAccount, TokenAmount, TxVersion, buildSimpleTransaction, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk"

import { IPool, IPoolScanner } from "../IPoolScanner";
import { RadyumPoolScanner } from "./RadyumPoolScanner";
import { AppConfig } from "../../config/config";


/**
 * Radyum specific pool
 */
export class RadyumPool implements IPool
{
    private m_oPoolScanner : RadyumPoolScanner;
    private m_strPoolAddress : string;
    private m_strTokenAddress : string;
    private m_oPoolData : ApiPoolInfoV4 | null = null;

    constructor( oScanner: RadyumPoolScanner, strPoolAddress : string, strPoolToken: string, oPoolData : ApiPoolInfoV4 )
    {
        this.m_oPoolScanner = oScanner;
        this.m_strPoolAddress = strPoolAddress;
        this.m_strTokenAddress = strPoolToken;
        this.m_oPoolData = oPoolData;
    }
    public get PoolScanner() : IPoolScanner
    {
        return this.m_oPoolScanner;
    }

    public get PoolId() : string { return this.m_strPoolAddress; }
    public get PoolToken() : string { return this.m_strTokenAddress; }

    public get PoolData(): unknown { return this.m_oPoolData; }

    public get LiquidityPoolKeys() : LiquidityPoolKeys | null
    {
        if( this.m_oPoolData == null ) return null;
        const poolKeys = jsonInfo2PoolKeys(this.m_oPoolData) as LiquidityPoolKeys
        return poolKeys;
    }

    // Creates pool gathering pool info
    public static async create(oScanner: RadyumPoolScanner, oConnection: Connection, strPoolAddress : string, strPoolToken: string): Promise<RadyumPool | undefined>
    {
        try {
            let account: AccountInfo<Buffer> | null = null
            while (account === null) account = await oConnection.getAccountInfo(new PublicKey(strPoolAddress))
            const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)
    
            const marketId = info.marketId
            let marketAccount: AccountInfo<Buffer> | null = null
            while (marketAccount === null) marketAccount = await oConnection.getAccountInfo(marketId)
            if (marketAccount === null) throw Error(' get market info error')
            const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)
    
            const lpMint = info.lpMint
            let lpMintAccount: AccountInfo<Buffer> | null = null
            while (lpMintAccount === null) lpMintAccount = await oConnection.getAccountInfo(lpMint, 'processed')
            const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)
    
            const oPoolInfo : ApiPoolInfoV4 ={
                id: strPoolAddress,
                baseMint: info.baseMint.toString(),
                quoteMint: info.quoteMint.toString(),
                lpMint: info.lpMint.toString(),
                baseDecimals: info.baseDecimal.toNumber(),
                quoteDecimals: info.quoteDecimal.toNumber(),
                lpDecimals: lpMintInfo.decimals,
                version: 4,
                programId: account.owner.toString(),
                authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
                openOrders: info.openOrders.toString(),
                targetOrders: info.targetOrders.toString(),
                baseVault: info.baseVault.toString(),
                quoteVault: info.quoteVault.toString(),
                withdrawQueue: info.withdrawQueue.toString(),
                lpVault: info.lpVault.toString(),
                marketVersion: 3,
                marketProgramId: info.marketProgramId.toString(),
                marketId: info.marketId.toString(),
                marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
                marketBaseVault: marketInfo.baseVault.toString(),
                marketQuoteVault: marketInfo.quoteVault.toString(),
                marketBids: marketInfo.bids.toString(),
                marketAsks: marketInfo.asks.toString(),
                marketEventQueue: marketInfo.eventQueue.toString(),
                lookupTableAccount: PublicKey.default.toString()
            };

            return new RadyumPool(oScanner, strPoolAddress, strPoolToken, oPoolInfo);
        } catch (e) {
            AppConfig.Logger.error('   Could not find pool info', e);
        }
    
        return undefined;
    }

}