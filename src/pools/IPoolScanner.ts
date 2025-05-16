


/***
 * Pool interface
 */
export interface IPool
{
    get PoolScanner() : IPoolScanner;

    get PoolId() : string;
    get PoolToken() : string;

    get PoolData(): unknown;
}


/**
 * Eventos
 */
export interface IBasicEvent<T> {
    on(handler: { (data?: T): void }) : void;
    off(handler: { (data?: T): void }) : void;
}


/***
 * 
 */
export class BasicEvent<T> implements IBasicEvent<T> {
    private handlers: { (data?: T): void; }[] = [];

    public on(handler: { (data?: T): void }) : void {
        this.handlers.push(handler);
    }

    public off(handler: { (data?: T): void }) : void {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public trigger(data?: T) {
        this.handlers.slice(0).forEach(h => h(data));
    }

    public expose() : IBasicEvent<T> {
        return this;
    }
}

/**
 * Pool scanner
 */
export interface IPoolScanner
{
    get OnNewPool() : IBasicEvent<IPool>;
    


    start() : Promise<boolean>;
    stop(): Promise<boolean>;
}

