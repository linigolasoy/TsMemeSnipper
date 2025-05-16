import { IPool } from "../pools/IPoolScanner";
import { IPosition, ITrader } from "./ITrader";



export class BasePosition implements IPosition
{
    private m_oPool: IPool;
    private m_oTrader: ITrader;
    private m_nBaseAmount: number = 0;
    private m_nQuoteAmount: number;

    private m_nPriceOpen: number = 0;
    private m_nPriceClose: number = 0;
    private m_bClosed: boolean = false;
    private m_dOpen : Date;
    private m_dClose: Date;

    constructor( oTrader: ITrader, oPool: IPool, nAmount: number )
    {
        this.m_oPool = oPool;
        this.m_oTrader = oTrader;
        this.m_nQuoteAmount = nAmount;
        this.m_dOpen = new Date();
        this.m_dClose = new Date();
    }

    public get DateOpen(): Date{  return this.m_dOpen; }
    public get DateClose(): Date { return this.m_dClose; }
    get Pool(): IPool { return this.m_oPool; }

    get Trader(): ITrader { return this.m_oTrader; }

    get BaseAmount(): number { return this.m_nBaseAmount; }
    get QuoteAmount(): number { return this.m_nQuoteAmount; }

    get PriceOpen(): number { return this.m_nPriceOpen; }
    get PriceClose(): number { return this.m_nPriceClose; }

    get Closed(): boolean { return this.m_bClosed; }
    set Closed( bClose: boolean ) {this.m_bClosed = bClose;}

}