
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
        BlockhashWithExpiryBlockHeight,
        Blockhash
     } from '@solana/web3.js';
import { 
    getAssociatedTokenAddressSync, 
    NATIVE_MINT, 
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    createAssociatedTokenAccountIdempotentInstruction
} from '@solana/spl-token';
import { blockhash } from '@solana/kit';




/***
 * Trader on radyum pools
 */
export class RadyumTrader implements ITrader
{
    private readonly onTradeEvent : BasicEvent<IPosition> = new BasicEvent<IPosition>();
    private readonly m_aPositions : IPosition[] = [];

    private m_oWrappedSol : PublicKey | null = null;
    private m_oWallet : IWallet;

    private static SOL_AMOUNT : number = 0.01;

    private readonly m_oQuoteAmount = new TokenAmount(Token.WSOL, RadyumTrader.SOL_AMOUNT, false);
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
        return false;
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
                    lamports: Math.ceil(RadyumTrader.SOL_AMOUNT * 10 ** 9),
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
            }
            /*
            }
            console.log('bought success')
            */
        } catch (e) 
        {
            AppConfig.Logger.error('Error on buy', e);
        }
        return false;
    }
}