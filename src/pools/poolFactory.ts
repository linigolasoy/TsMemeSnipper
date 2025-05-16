
import {IPoolScanner} from './IPoolScanner'
import { RadyumPoolScanner } from './Radyum/RadyumPoolScanner'



/***
 * Pool factory
 */
export abstract class PoolFactory
{
    public static createRadyumScanner() :IPoolScanner
    {
        return new RadyumPoolScanner();
    }

}

