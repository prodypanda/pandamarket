import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/pool',()=>({query:vi.fn(),transaction:vi.fn()}));
vi.mock('../utils/crypto',()=>({pdId:vi.fn((entity:string)=>`pd_${entity}_test`)}));
vi.mock('../services/platform-config.service',()=>({platformConfigService:{getSettings:vi.fn().mockResolvedValue({ads_enabled:true,ads_moderation_required:true,ads_min_daily_budget_tnd:1,ads_max_campaign_days:90,ads_frequency_cap_daily:5,ads_click_attribution_days:7,ads_view_attribution_days:1,ads_sponsored_products_enabled:true,ads_sponsored_brands_enabled:true,ads_sponsored_content_enabled:true})}}));
vi.mock('../config',()=>({config:{jwt:{secret:'test-secret'},hubDomain:'http://localhost:3000',logLevel:'info'}}));

import { query, transaction } from '../db/pool';
import { AdsService } from '../services/ads.service';

const mockQuery=vi.mocked(query); const mockTransaction=vi.mocked(transaction);
const result=(rows:any[])=>({rows,rowCount:rows.length,command:'SELECT',oid:0,fields:[]} as any);

describe('AdsService',()=>{
 let service:AdsService;
 beforeEach(()=>{vi.clearAllMocks();service=new AdsService();});

 it('scopes campaign lookup to the requesting store',async()=>{
  mockQuery.mockResolvedValueOnce(result([]));
  await expect(service.getCampaign('pd_store_A','pd_adcmp_B')).rejects.toThrow('Ads campaign not found');
  expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('store_id = $2'),['pd_adcmp_B','pd_store_A']);
 });

 it('scopes campaign lists to the requesting store',async()=>{
  mockQuery.mockResolvedValueOnce(result([]));
  await service.listCampaigns('pd_store_A');
  expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('c.store_id = $1'),['pd_store_A']);
 });

 it('rejects sponsored product campaigns without a selected product',async()=>{
  const client={query:vi.fn().mockResolvedValueOnce(result([{id:'pd_adacct_A',balance:'10',status:'active'}]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  await expect(service.createCampaign('pd_store_A',{campaign_type:'sponsored_product',creative:{title:'Ad'},placement_ids:['pd_adpl_1']})).rejects.toThrow('require a product');
 });

 it('rejects a product owned by another store',async()=>{
  const client={query:vi.fn()
   .mockResolvedValueOnce(result([{id:'pd_adacct_A',balance:'10',status:'active'}]))
   .mockResolvedValueOnce(result([]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  await expect(service.createCampaign('pd_store_A',{campaign_type:'sponsored_product',creative:{title:'Ad',product_id:'pd_product_B'},placement_ids:['pd_adpl_1']})).rejects.toThrow('does not belong');
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('store_id=$2'),['pd_product_B','pd_store_A']);
 });

 it('rejects unpublished products',async()=>{
  const client={query:vi.fn()
   .mockResolvedValueOnce(result([{id:'pd_adacct_A',balance:'10',status:'active'}]))
   .mockResolvedValueOnce(result([{id:'pd_product_A',status:'draft'}]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  await expect(service.createCampaign('pd_store_A',{campaign_type:'sponsored_product',creative:{title:'Ad',product_id:'pd_product_A'},placement_ids:['pd_adpl_1']})).rejects.toThrow('Only published');
 });

 it('rejects campaigns without placements',async()=>{
  const client={query:vi.fn().mockResolvedValueOnce(result([{id:'pd_adacct_A',balance:'10',status:'active'}]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  await expect(service.createCampaign('pd_store_A',{campaign_type:'sponsored_content',creative:{title:'Ad'},placement_ids:[]})).rejects.toThrow('at least one');
 });

 it('prevents submitting when the Ads account has no funds',async()=>{
  const client={query:vi.fn()
   .mockResolvedValueOnce(result([{id:'pd_adcmp_A',store_id:'pd_store_A',status:'draft',spent_amount:'0',daily_budget:'5',total_budget:'50'}]))
   .mockResolvedValueOnce(result([{id:'pd_adacct_A',store_id:'pd_store_A',status:'active',balance:'0'}]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  await expect(service.transition('pd_store_A','pd_adcmp_A','pending_review')).rejects.toThrow('Refill');
 });

 it('allows draft submission to become approved when moderation is disabled',async()=>{
  const {platformConfigService}=await import('../services/platform-config.service');
  vi.mocked(platformConfigService.getSettings).mockResolvedValueOnce({ads_moderation_required:false} as any);
  const client={query:vi.fn()
   .mockResolvedValueOnce(result([{id:'pd_adcmp_A',store_id:'pd_store_A',status:'draft',spent_amount:'0',daily_budget:'5',total_budget:'50'}]))
   .mockResolvedValueOnce(result([{id:'pd_adacct_A',store_id:'pd_store_A',status:'active',balance:'50'}]))
   .mockResolvedValueOnce(result([{id:'pd_adcmp_A',status:'approved'}]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  const campaign=await service.transition('pd_store_A','pd_adcmp_A','pending_review');
  expect(campaign.status).toBe('approved');
 });

 it('returns prior ledger transaction for an idempotent credit',async()=>{
  const account={id:'pd_adacct_A',store_id:'pd_store_A',balance:'10'};
  const ledger={id:'pd_adtx_A',idempotency_key:'credit-1'};
  const client={query:vi.fn().mockResolvedValueOnce(result([account])).mockResolvedValueOnce(result([ledger]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  const value=await service.credit('pd_store_A',5,{idempotencyKey:'credit-1'});
  expect(value.transaction).toEqual(ledger);
  expect(client.query).toHaveBeenCalledTimes(2);
 });

 it('estimates CPC delivery from enabled placement rates',async()=>{
  mockQuery.mockResolvedValueOnce(result([{id:'pd_adpl_1',name:'Search',default_price:'0.200',default_pricing_model:'cpc'}]));
  const estimate=await service.estimateDelivery({pricing_model:'cpc',bid_amount:.25,daily_budget:5,total_budget:20,placement_ids:['pd_adpl_1']});
  expect(estimate.metric).toBe('clicks');
  expect(estimate.range).toEqual({low:56,high:92});
  expect(estimate.recommended_bid).toBe(.2);
 });

 it('rejects unavailable placements while estimating delivery',async()=>{
  mockQuery.mockResolvedValueOnce(result([]));
  await expect(service.estimateDelivery({pricing_model:'cpm',bid_amount:8,daily_budget:10,total_budget:50,placement_ids:['missing']})).rejects.toThrow('unavailable');
 });

 it('applies elapsed-day budget pacing during delivery',async()=>{
  mockQuery.mockResolvedValueOnce(result([]));
  await service.deliver('search.top_results',4,{locale:'en',device:'desktop'});
  expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("EXTRACT(EPOCH FROM (NOW()-date_trunc('day',NOW())))"),expect.any(Array));
 });

 it('bulk updates placement pricing with normalized TND values',async()=>{
  mockQuery.mockResolvedValueOnce(result([{id:'one'},{id:'two'}]));
  const placements=await service.bulkUpdatePlacementPricing('cpc',.1234,['one','two']);
  expect(placements).toHaveLength(2);
  expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('default_pricing_model=$1'),['cpc',.123,['one','two']]);
 });

 it('returns duplicate without charging a repeated event key',async()=>{
  const payload={campaign_id:'pd_adcmp_A',creative_id:'pd_adcrt_A',placement_id:'pd_adpl_A',exp:Date.now()+60000};
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const crypto=await import('crypto');const signature=crypto.createHmac('sha256','test-secret').update(encoded).digest('base64url');
  const client={query:vi.fn().mockResolvedValueOnce(result([{id:'pd_adevt_existing'}]))};
  mockTransaction.mockImplementation(async(fn:any)=>fn(client));
  await expect(service.recordEvent({token:`${encoded}.${signature}`,eventType:'click',eventKey:'existing-event-key'})).resolves.toEqual({recorded:false,duplicate:true});
  expect(client.query).toHaveBeenCalledTimes(1);
 });

 it('applies configured click and view windows to attribution lookup',async()=>{
  const client={query:vi.fn().mockResolvedValueOnce(result([{campaign_id:'pd_adcmp_A',event_id:'pd_adevt_A',event_type:'click',product_id:'pd_product_A'}]))};
  const hit=await service.findAttribution(client as any,{eventKey:'event-key-123',campaignId:'pd_adcmp_A',creativeId:'pd_adcrt_A'});
  expect(hit?.event_type).toBe('click');
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining("e.event_type='click'"),['event-key-123','pd_adcmp_A','pd_adcrt_A',7,1]);
 });

 it('uses store scoping for analytics queries',async()=>{
  mockQuery
   .mockResolvedValueOnce(result([{impressions:'0',clicks:'0',conversions:'0',spend:'0',revenue:'0'}]))
   .mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([]));
  await service.getAnalytics('pd_store_A',{from:'2026-01-01',to:'2026-01-31'});
  expect(mockQuery.mock.calls.every(call=>String(call[0]).includes('store_id=$1'))).toBe(true);
  expect(mockQuery.mock.calls[0][1]).toEqual(['pd_store_A','2026-01-01','2026-01-31']);
 });
});
