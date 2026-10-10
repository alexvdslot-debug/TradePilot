import {WorkerEntrypoint} from 'cloudflare:workers';
import {backgroundProviderRead} from './src/provider-adapter.mjs';
export {default} from './market-data.js';
/** Named RPC entrypoint. The default/public fetch still requires Access for adapter paths. */
export class BackgroundMarket extends WorkerEntrypoint {
 fetch(){return new Response(null,{status:404});}
 async read(input){return backgroundProviderRead(input,this.env);}
}
