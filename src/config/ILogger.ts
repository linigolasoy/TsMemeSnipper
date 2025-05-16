/***
 * Logging interface
 */

export interface ILogger 
{
    info( strMessage : string ): void;

    debug( strMessage : string ): void;

    warn( strMessage: string ): void;
    
    error( strMessage: string, e : Error | undefined ): void;
    

}