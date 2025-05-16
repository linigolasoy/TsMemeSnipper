import { Connection, PublicKey, LogsFilter, Logs } from "@solana/web3.js";
import { MintLayout } from '@solana/spl-token';


export class TokenStatus 
{
    public MintRenounced : boolean = false;
    public Freezed : boolean = false;
    public Burned : boolean = false;
}
export abstract class TokenCheck
{

    public static async GetTokenStatus( oConnection: Connection, oVault : PublicKey, oMint : PublicKey) : Promise<TokenStatus | undefined>
    {
        try 
        {
            let { data } = (await oConnection.getAccountInfo(oVault)) || {};
            if (!data) return undefined;

            
            
            const deserialize = MintLayout.decode(data);
            const oStatus = new TokenStatus();

            oStatus.MintRenounced = (deserialize.mintAuthorityOption === 0);
            oStatus.Freezed = (deserialize.freezeAuthorityOption === 0);
            const amount = await oConnection.getTokenSupply(oMint, 'confirmed');
            oStatus.Burned = (amount.value.uiAmount === 0);
          

            return oStatus;
        } 
        catch (e) 
        {
              return undefined;
        }

    }

    public static async IsMintable( oConnection: Connection, oVault : PublicKey): Promise<boolean | undefined>
    {
        try 
        {
              let { data } = (await oConnection.getAccountInfo(oVault)) || {}
              if (!data) return undefined;
              const deserialize = MintLayout.decode(data)
              return deserialize.mintAuthorityOption === 0;
        } 
        catch (e) 
        {
              return false
        }
    }
          

}