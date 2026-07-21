import { PaymentGateway } from '@pandamarket/types';
import { getPaymentProvider } from '../plugins/payment';
import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { roundTnd } from '../utils/money';
import { config } from '../config';
import { PdNotFoundError, PdValidationError, PdErrorCode } from '../errors';
import { adsService } from './ads.service';
import { platformConfigService } from './platform-config.service';

export class AdsRefillService {
  async create(storeId:string,userId:string,email:string,gateway:PaymentGateway,rawAmount:number){
    if (![PaymentGateway.Flouci,PaymentGateway.Konnect].includes(gateway)) throw new PdValidationError('Ads refills support Flouci or Konnect');
    const settings=await platformConfigService.getSettings(); if(!settings.ads_enabled)throw new PdValidationError('PandaMarket Ads is currently disabled');
    const amount=roundTnd(rawAmount); const min=Number(settings.ads_min_refill_tnd),max=Number(settings.ads_max_refill_tnd); if(amount<min||amount>max) throw new PdValidationError(`Ads refill must be between ${min} and ${max} TND`);
    const account=await adsService.getAccount(storeId); const id=pdId('adrfl');
    const base=config.hubDomain.startsWith('http')?config.hubDomain:`https://${config.hubDomain}`;
    await query(`INSERT INTO pd_ads_refill_intent (id,account_id,store_id,gateway,amount,created_by) VALUES ($1,$2,$3,$4,$5,$6)`,[id,account.id,storeId,gateway,amount,userId]);
    try{
      const result=await getPaymentProvider(gateway).init({ order_id:id,amount,currency:'TND',customer_email:email,success_url:`${base}/hub/dashboard/ads?refill=${id}`,fail_url:`${base}/hub/dashboard/ads?refill=${id}&status=failed` });
      const updated=await query(`UPDATE pd_ads_refill_intent SET gateway_reference=$2,checkout_url=$3,metadata=$4,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,result.gateway_reference,result.redirect_url,result.metadata||{}]);
      return updated.rows[0];
    }catch(error){await query(`UPDATE pd_ads_refill_intent SET status='failed',updated_at=NOW() WHERE id=$1`,[id]);throw error;}
  }

  async list(storeId:string){return (await query(`SELECT id,gateway,amount,currency,status,gateway_reference,created_at,captured_at FROM pd_ads_refill_intent WHERE store_id=$1 ORDER BY created_at DESC LIMIT 50`,[storeId])).rows;}

  async settle(storeId:string,intentId:string){
    const found=await query(`SELECT * FROM pd_ads_refill_intent WHERE id=$1 AND store_id=$2`,[intentId,storeId]); const intent=found.rows[0];
    if(!intent)throw new PdNotFoundError(PdErrorCode.NOT_FOUND,'Ads refill not found'); if(intent.status==='captured')return intent;
    if(intent.status!=='pending'||new Date(intent.expires_at).getTime()<Date.now())throw new PdValidationError('Ads refill is no longer payable');
    const result=await getPaymentProvider(intent.gateway as PaymentGateway).verify(intent.gateway_reference);
    if(result.status!=='captured')throw new PdValidationError('Payment is not captured yet');
    if(result.amount!==undefined&&Math.abs(Number(result.amount)-Number(intent.amount))>.001)throw new PdValidationError('Captured amount does not match refill intent');
    return transaction(async(c)=>{
      const locked=await c.query(`SELECT * FROM pd_ads_refill_intent WHERE id=$1 FOR UPDATE`,[intentId]); if(locked.rows[0].status==='captured')return locked.rows[0];
      await c.query(`SELECT id FROM pd_ads_account WHERE id=$1 FOR UPDATE`,[intent.account_id]);
      const updated=await c.query(`UPDATE pd_ads_account SET balance=balance+$2,updated_at=NOW() WHERE id=$1 RETURNING *`,[intent.account_id,intent.amount]);
      await c.query(`INSERT INTO pd_ads_transaction (id,account_id,type,amount,balance_after,idempotency_key,payment_reference,description) VALUES ($1,$2,'refill',$3,$4,$5,$6,$7)`,[pdId('adtx'),intent.account_id,intent.amount,updated.rows[0].balance,`refill:${intent.id}`,intent.gateway_reference,`${intent.gateway} Ads refill`]);
      return (await c.query(`UPDATE pd_ads_refill_intent SET status='captured',captured_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[intent.id])).rows[0];
    });
  }
}
export const adsRefillService=new AdsRefillService();
