import lo from "lodash";
import {Liquidity, TokenAmount, Token} from '@raydium-io/raydium-sdk';
import { ITrader, IPosition, IWallet } from "../ITrader";
import {IBasicEvent, BasicEvent} from '../../config/IBasicEvent';
import { IPool } from '../../pools/IPoolScanner';
import { AppConfig } from "../../config/config";
import { RadyumPool } from '../../pools/Radyum/RadyumPool';
import { 
        Connection, 
        PublicKey, 
        TransactionInstruction, 
        ComputeBudgetProgram,
        SystemProgram,
        TransactionMessage,
        VersionedTransaction,
        AccountInfo,
        Blockhash,
        Logs
     } from '@solana/web3.js';
import { 
    getAssociatedTokenAddressSync, 
    getAssociatedTokenAddress,
    NATIVE_MINT, 
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    createAssociatedTokenAccountIdempotentInstruction,
    createCloseAccountInstruction
} from '@solana/spl-token';
import { blockhash } from '@solana/kit';
import { BasePosition } from '../BasePosition';




/***
 * Trader on radyum pools
 */
export class RadyumTrader implements ITrader
{
    private readonly onTradeEvent : BasicEvent<IPosition> = new BasicEvent<IPosition>();
    private readonly m_aPositions : IPosition[] = [];

    private m_oWrappedSol : PublicKey | null = null;
    private m_oWallet : IWallet;


    private readonly m_oQuoteAmount = new TokenAmount(Token.WSOL, AppConfig.SolAmount, false);
    private m_oConnection : Connection;

    constructor( oWallet: IWallet )
    {
        this.m_oWallet = oWallet;
        if( AppConfig.RpcUrl == undefined ) throw new Error('No Rpc Url');
        this.m_oConnection = new Connection(AppConfig.RpcUrl, { wsEndpoint: AppConfig.WssUrl });
    }

    public get Wallet() : IWallet
    {
        return this.m_oWallet;
    }
    public get Positions() : IPosition[]
    {
        return this.m_aPositions;
    }

    public get OnTrade() : IBasicEvent<IPosition>
    {
        { return this.onTradeEvent.expose(); }
    }
    

    public async start() : Promise<boolean>
    {

        if( this.m_oConnection == null || this.m_oConnection == undefined ) return false;
        return true;
    }

    public async stop(): Promise<boolean>
    {
        return false;
    }

    public async actOnPool( oPool: IPool ) : Promise<boolean>
    {
        AppConfig.Logger.info("Needs acting on pool");
        return await this.buy(oPool);
    }


    public async step(): Promise<void>
    {
        for( var oPos of this.m_aPositions )
        {
            var dNow = new Date();
            if( oPos.Closed ) continue;
            const nSeconds = (dNow.getTime() - oPos.DateOpen.getTime()) / 1000;
            if( nSeconds < 60 ) continue;
            const bResult : boolean = await this.sell(oPos);
            if( bResult )
            {
                oPos.Closed = true;
            }

            await AppConfig.sleep(2000);
        }
    }

    // Sell 
    private async sell( oPosition: IPosition ): Promise<boolean>
    {
        try
        {
            const oMint : PublicKey = new PublicKey(oPosition.Pool.PoolToken);
            const sourceAccount = await getAssociatedTokenAddress(
                new PublicKey(oMint),
                this.Wallet.Address
            );
            if (!sourceAccount) {
                AppConfig.Logger.error("Sell token account not exist", undefined);
                return true;
            }

            const info = await this.m_oConnection.getTokenAccountBalance(sourceAccount)
            const amount = Number(info.value.amount)
            const oRadPool : RadyumPool = oPosition.Pool as RadyumPool;
            const oPoolKeys = oRadPool.LiquidityPoolKeys;

            if (amount == 0 || oPoolKeys == null || this.m_oWrappedSol == null) {
                AppConfig.Logger.error("Not balance", undefined);
                return false;
            }

            AppConfig.Logger.info( `>>>>>> SELLING [${oPosition.Pool.PoolToken}] Amount [${amount.toString()}]`)
            const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
                {
                    poolKeys: oPoolKeys,
                    userKeys: {
                        tokenAccountOut: this.m_oWrappedSol,
                        tokenAccountIn: sourceAccount,
                        owner: this.Wallet.Address,
                    },
                    amountIn: amount,
                    minAmountOut: 0,
                },
                4,
            )

            const latestBlockhash = await this.m_oConnection.getLatestBlockhash({
                commitment: 'confirmed',
            })

            const messageV0 = new TransactionMessage({
                payerKey: this.Wallet.Address,
                recentBlockhash: latestBlockhash.blockhash,
                instructions: [
                    ...innerTransaction.instructions,
                    createCloseAccountInstruction(this.m_oWrappedSol, this.Wallet.Address, this.Wallet.Address),
                ],
            }).compileToV0Message()

            const transaction = new VersionedTransaction(messageV0)
            transaction.sign([this.Wallet.Signer, ...innerTransaction.signers])

            return await this.executeTransaction(transaction, latestBlockhash.blockhash);
        }    
        catch (e: any) {
            AppConfig.Logger.error('Error on sell', e);
            await AppConfig.sleep(1000)
        }

        return false;
    }

    private async executeTransaction( oTransaction: VersionedTransaction, oLatestBlock: Blockhash): Promise<boolean>
    {
        try 
        {
            if( this.m_oConnection == null || this.m_oConnection == undefined ) return false;
            /*
            const simRes = await this.m_oConnection.simulateTransaction(oTransaction)
            if (simRes.value.err) 
            {
                AppConfig.Logger.error('Sim error', simRes.value.err);
                return false
            }
            */

            const signature = await this.m_oConnection.sendRawTransaction(oTransaction.serialize(), {
                skipPreflight: true,
            });
            
            AppConfig.Logger.info(` Tx Signature [${signature}], Confirming transaction...`);
            
            const confirmation = await this.m_oConnection.confirmTransaction(
                signature,
                'confirmed',
            );
          
            AppConfig.Logger.info(` Tx Confirm result [${confirmation}]`);
          
            if (confirmation.value.err) {
                AppConfig.Logger.error('Tx error', confirmation.value.err);
                return false
            }
            return true;
        } 
        catch (e) 
        {
            AppConfig.Logger.error('Error executing Tx', e);
            return false
        }
          
    }



    // Execute buy on pool
    // const buy = async (accountId: PublicKey, baseMint: PublicKey, poolKeys: LiquidityPoolKeysV4): Promise<void> =>
    private async buy( oPool: IPool) : Promise<boolean>
    {
        try 
        {
            if( this.m_oWrappedSol == null )
            {
                this.m_oWrappedSol = getAssociatedTokenAddressSync(NATIVE_MINT, this.Wallet.Address);
            }
            // quoteTokenAssociatedAddress = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey)
            AppConfig.Logger.info('Buying...');

            const oRadPool : RadyumPool = oPool as RadyumPool;
            if( oRadPool.LiquidityPoolKeys == null ) return false;
            const oBaseMint : PublicKey = new PublicKey(oPool.PoolToken);

            // buyStatus(accountId.toString(), 1, '')
            const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
                {
                    poolKeys: oRadPool.LiquidityPoolKeys,
                    userKeys: {
                        tokenAccountIn: this.m_oWrappedSol,
                        tokenAccountOut: getAssociatedTokenAddressSync(oBaseMint, this.Wallet.Address),
                        owner: this.Wallet.Address,
                    },
                    amountIn: this.m_oQuoteAmount.raw,
                    minAmountOut: 0,
                },
                oRadPool.LiquidityPoolKeys.version
            )
    
            const instructions: TransactionInstruction[] = []
    
            if (!await this.m_oConnection.getAccountInfo(this.m_oWrappedSol))
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        this.Wallet.Address,
                        this.m_oWrappedSol,
                        this.Wallet.Address,
                        NATIVE_MINT,
                    )
                )

            instructions.push(
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
                ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
                SystemProgram.transfer({
                    fromPubkey: this.Wallet.Address,
                    toPubkey: this.m_oWrappedSol,
                    lamports: Math.ceil(AppConfig.SolAmount * 10 ** 9),
                }),
                createSyncNativeInstruction(this.m_oWrappedSol, TOKEN_PROGRAM_ID),
                createAssociatedTokenAccountIdempotentInstruction(
                    this.Wallet.Address,
                    getAssociatedTokenAddressSync(oBaseMint, this.Wallet.Address),
                    this.Wallet.Address,
                    oBaseMint,
                ),
                ...innerTransaction.instructions,
            )

            await AppConfig.sleep(1000);
            const latestBlockhash = await this.m_oConnection.getLatestBlockhash({
                commitment: 'confirmed',
            })
    
    
            const messageV0 = new TransactionMessage({
                payerKey: this.Wallet.Address,
                recentBlockhash: latestBlockhash.blockhash,
                instructions,
            }).compileToV0Message()
            const transaction = new VersionedTransaction(messageV0)
    
            transaction.sign([this.Wallet.Signer, ...innerTransaction.signers])
            /*
    
            if (jitoMode) {
                if (false) {
                    await jitoWithAxios(transaction, wallet, latestBlockhash)
                } else {
                    const result = await bundle([transaction], wallet)
                    // if (!result) {
                    //     processingToken = false
                    //     buyStatus(poolId.toString(), 3, '')
                    // }
                }
            } else {
            */
            const res = await this.executeTransaction(transaction, latestBlockhash.blockhash)
            if (!res) 
            {
                AppConfig.Logger.error('Buy failed', undefined);
                return false;
            }

            const oPosition: IPosition = new BasePosition(this, oPool, AppConfig.SolAmount);
            this.m_aPositions.push(oPosition);
            return true;
        } catch (e) 
        {
            AppConfig.Logger.error('Error on buy', e);
        }
        return false;
    }
}