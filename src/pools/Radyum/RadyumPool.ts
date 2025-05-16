import { IPool, IPoolScanner } from "../IPoolScanner";
import { RadyumPoolScanner } from "./RadyumPoolScanner";


/**
 * Radyum specific pool
 */
export class RadyumPool implements IPool
{
    private m_oPoolScanner : RadyumPoolScanner;
    private m_strPoolAddress : string;
    private m_strTokenAddress : string;
    private m_oPoolData : unknown = null;

    constructor( oScanner: RadyumPoolScanner, strPoolAddress : string, strPoolToken: string )
    {
        this.m_oPoolScanner = oScanner;
        this.m_strPoolAddress = strPoolAddress;
        this.m_strTokenAddress = strPoolToken;
    }
    public get PoolScanner() : IPoolScanner
    {
        return this.m_oPoolScanner;
    }

    public get PoolId() : string { return this.m_strPoolAddress; }
    public get PoolToken() : string { return this.m_strTokenAddress; }

    public get PoolData(): unknown { return this.m_oPoolData; }

}