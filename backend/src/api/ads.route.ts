import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adsService, AdsCampaignStatus } from '../services/ads.service';
import { adsDeliveryRateLimit, adsEventRateLimit, asyncHandler, optionalAuth, requireStore, validate } from '../middlewares';
import * as crypto from 'crypto';
import { config } from '../config';
import { adsRefillService } from '../services/ads-refill.service';
import { PaymentGateway } from '@pandamarket/types';
import { query } from '../db/pool';

const router = Router();
const deliveryQuerySchema = z.object({ placement: z.string().min(2).max(100), limit: z.coerce.number().int().min(1).max(12).default(4), locale:z.enum(['all','fr','en','ar']).default('all'), category:z.string().trim().max(120).optional(), device:z.enum(['all','mobile','desktop']).default('all') });
const eventSchema = z.object({ token:z.string().min(20).max(4096), event_type:z.enum(['impression','click']), event_key:z.string().min(12).max(160), session_hash:z.string().max(128).optional() });
router.get('/public/delivery', adsDeliveryRateLimit, validate(deliveryQuerySchema, 'query'), asyncHandler(async (req: Request, res: Response) => {
  const q=req.query as unknown as {placement:string;limit:number;locale:string;category?:string;device:string};
  res.setHeader('Cache-Control','no-store');
  res.json({ ads:await adsService.deliver(q.placement,q.limit,{locale:q.locale,category:q.category,device:q.device}) });
}));
router.post('/public/events', adsEventRateLimit, optionalAuth, validate(eventSchema), asyncHandler(async (req: Request, res: Response) => {
  const agent=String(req.headers['user-agent']||'').toLowerCase();
  if (!agent || /(bot|crawler|spider|headless|preview|facebookexternalhit|slurp)/.test(agent)) {
    res.status(202).json({ recorded:false, bot_filtered:true }); return;
  }
  const ip=String(req.ip||'');
  const ipHash=crypto.createHash('sha256').update(`${config.jwt.secret}:${ip}`).digest('hex');
  res.status(202).json(await adsService.recordEvent({ token:req.body.token,eventType:req.body.event_type,eventKey:req.body.event_key,sessionHash:req.body.session_hash,ipHash,viewerStoreId:req.user?.store_id }));
}));
router.get('/public/click', asyncHandler(async(req:Request,res:Response)=>{
  const token=typeof req.query.token==='string'?req.query.token:'';
  res.redirect(302,await adsService.resolveClick(token));
}));

const creativeSchema = z.object({
  product_id: z.string().min(1).optional(), title: z.string().trim().min(1).max(160), description: z.string().max(2000).optional(),
  image_url: z.string().max(2048).refine(value=>value===''||/^\/(?!\/)/.test(value)||/^https?:\/\//i.test(value),'Invalid image URL').optional(), cta_label: z.string().max(80).optional(), destination_url: z.string().max(2048).refine(value=>value===''||/^\/(?!\/)/.test(value)||/^https?:\/\//i.test(value),'Invalid destination URL').optional(),
});
const campaignBaseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  campaign_type: z.enum(['sponsored_product','sponsored_brand','sponsored_content']),
  objective: z.enum(['awareness','traffic','sales','conversions']).default('traffic'),
  pricing_model: z.enum(['cpc','cpm','fixed_daily']).default('cpc'),
  bid_amount: z.number().min(0).default(0), daily_budget: z.number().positive(), total_budget: z.number().positive(),
  starts_at: z.string().datetime().optional(), ends_at: z.string().datetime().optional(), targeting: z.record(z.string(), z.unknown()).default({}),
  placement_ids: z.array(z.string().min(1)).max(20).default([]), creative: creativeSchema.optional(),
});
const campaignSchema = campaignBaseSchema.refine((v) => v.total_budget >= v.daily_budget, { message: 'Total budget must be at least the daily budget', path: ['total_budget'] });
const updateSchema = campaignBaseSchema.pick({ name:true, bid_amount:true, daily_budget:true, total_budget:true, starts_at:true, ends_at:true, targeting:true }).partial();

const analyticsQuerySchema = z.object({
  from: z.string().date().optional(), to: z.string().date().optional(), campaign_id: z.string().min(1).optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'Invalid date range' });
const refillSchema=z.object({amount:z.number().positive().max(1000000),gateway:z.enum([PaymentGateway.Flouci,PaymentGateway.Konnect])});
router.get('/account', requireStore, asyncHandler(async (req: Request, res: Response) => res.json({ account: await adsService.getAccount(req.user!.store_id!) })));
router.get('/refills',requireStore,asyncHandler(async(req:Request,res:Response)=>res.json({refills:await adsRefillService.list(req.user!.store_id!)})));
router.post('/refills',requireStore,validate(refillSchema),asyncHandler(async(req:Request,res:Response)=>{
  const user=await query<{email:string}>('SELECT email FROM pd_user WHERE id=$1',[req.user!.id]);
  const refill=await adsRefillService.create(req.user!.store_id!,req.user!.id,user.rows[0]?.email||'',req.body.gateway,req.body.amount);
  res.status(201).json({refill,checkout_url:refill.checkout_url});
}));
router.post('/refills/:id/verify',requireStore,asyncHandler(async(req:Request,res:Response)=>res.json({refill:await adsRefillService.settle(req.user!.store_id!,req.params.id)})));
router.get('/analytics', requireStore, validate(analyticsQuerySchema, 'query'), asyncHandler(async (req: Request, res: Response) => {
  const q=req.query as unknown as {from?:string;to?:string;campaign_id?:string};
  res.json(await adsService.getAnalytics(req.user!.store_id!, { from:q.from,to:q.to,campaignId:q.campaign_id }));
}));
router.get('/transactions', requireStore, asyncHandler(async (req: Request, res: Response) => res.json({ transactions: await adsService.listTransactions(req.user!.store_id!, Number(req.query.limit) || 50) })));
router.get('/placements', requireStore, asyncHandler(async (_req: Request, res: Response) => res.json({ placements: await adsService.listPlacements() })));
router.get('/campaigns', requireStore, asyncHandler(async (req: Request, res: Response) => res.json({ campaigns: await adsService.listCampaigns(req.user!.store_id!) })));
router.post('/campaigns', requireStore, validate(campaignSchema), asyncHandler(async (req: Request, res: Response) => res.status(201).json({ campaign: await adsService.createCampaign(req.user!.store_id!, req.body) })));
router.get('/campaigns/:id', requireStore, asyncHandler(async (req: Request, res: Response) => res.json({ campaign: await adsService.getCampaign(req.user!.store_id!, req.params.id) })));
router.patch('/campaigns/:id', requireStore, validate(updateSchema), asyncHandler(async (req: Request, res: Response) => res.json({ campaign: await adsService.updateCampaign(req.user!.store_id!, req.params.id, req.body) })));

const actions: Record<string, AdsCampaignStatus> = { submit:'pending_review', launch:'active', pause:'paused', resume:'active', cancel:'cancelled' };
router.post('/campaigns/:id/:action', requireStore, asyncHandler(async (req: Request, res: Response) => {
  const status = actions[req.params.action];
  if (!status) {
    res.status(404).json({ error: { message: 'Unknown campaign action' } });
    return;
  }
  res.json({ campaign: await adsService.transition(req.user!.store_id!, req.params.id, status) });
}));

export default router;
