import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { PdNotFoundError, PdValidationError, PdErrorCode } from '../errors';
import { roundTnd } from '../utils/money';
import * as crypto from 'crypto';
import { config } from '../config';
import { platformConfigService } from './platform-config.service';
import { notificationService } from './notification.service';
import { emailQueue } from '../queues/email-queue';

export type AdsCampaignStatus = 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'active' | 'paused' | 'completed' | 'rejected' | 'cancelled' | 'exhausted';

const transitions: Record<AdsCampaignStatus, AdsCampaignStatus[]> = {
  draft: ['pending_review', 'cancelled'],
  pending_review: ['approved', 'rejected', 'cancelled'],
  approved: ['scheduled', 'active', 'paused', 'cancelled'],
  scheduled: ['active', 'paused', 'cancelled'],
  active: ['paused', 'completed', 'exhausted', 'cancelled'],
  paused: ['active', 'cancelled'],
  completed: [], rejected: ['draft', 'cancelled'], cancelled: [], exhausted: [],
};

export class AdsService {
  private async reserveFunds(client: PoolClient, storeId: string, campaignId: string, amount: number) {
    if (amount <= 0) return;
    const account = await this.getOrCreateAccount(storeId, client);
    if (Number(account.balance) < amount) throw new PdValidationError('Insufficient Ads balance to reserve funds');
    
    const updatedAccount = await client.query(
      `UPDATE pd_ads_account SET balance = balance - $2, reserved_balance = reserved_balance + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [account.id, amount]
    );
    await client.query(
      `UPDATE pd_ads_campaign SET reserved_amount = reserved_amount + $2, updated_at = NOW() WHERE id = $1`,
      [campaignId, amount]
    );
    await client.query(
      `INSERT INTO pd_ads_transaction (id, account_id, campaign_id, type, amount, balance_after, description)
       VALUES ($1,$2,$3,'reservation',$4,$5,$6)`,
      [pdId('adtx'), account.id, campaignId, -amount, updatedAccount.rows[0].balance, `Reserve daily budget for campaign ${campaignId}`]
    );
  }

  private async releaseFunds(client: PoolClient, storeId: string, campaignId: string, amount: number) {
    if (amount <= 0) return;
    const account = await this.getOrCreateAccount(storeId, client);
    const release = Math.min(amount, Number(account.reserved_balance));
    if (release <= 0) return;

    const updatedAccount = await client.query(
      `UPDATE pd_ads_account SET balance = balance + $2, reserved_balance = GREATEST(0, reserved_balance - $2), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [account.id, release]
    );
    await client.query(
      `UPDATE pd_ads_campaign SET reserved_amount = GREATEST(0, reserved_amount - $2), updated_at = NOW() WHERE id = $1`,
      [campaignId, release]
    );
    await client.query(
      `INSERT INTO pd_ads_transaction (id, account_id, campaign_id, type, amount, balance_after, description)
       VALUES ($1,$2,$3,'reservation_release',$4,$5,$6)`,
      [pdId('adtx'), account.id, campaignId, release, updatedAccount.rows[0].balance, `Release reserved budget for campaign ${campaignId}`]
    );
  }

  async allocateReservations(storeId: string, client?: PoolClient) {
    const run = async (c: PoolClient) => {
      const account = await this.getOrCreateAccount(storeId, c);
      if (account.status !== 'active' || Number(account.balance) <= 0) return;

      const activeCampaigns = await c.query<{ id: string; daily_budget: string; total_budget: string; spent_amount: string; reserved_amount: string }>(
        `SELECT id, daily_budget, total_budget, spent_amount, reserved_amount FROM pd_ads_campaign 
         WHERE store_id = $1 AND status = 'active' FOR UPDATE`,
        [storeId]
      );

      for (const campaign of activeCampaigns.rows) {
        const balance = Number(account.balance);
        if (balance <= 0) break;

        const dailySpend = await c.query<{ spend: string }>(
          `SELECT COALESCE(SUM(spend), 0)::text AS spend FROM pd_ads_daily_stat WHERE campaign_id = $1 AND stat_date = CURRENT_DATE`,
          [campaign.id]
        );
        const currentDailySpend = Number(dailySpend.rows[0]?.spend || 0);
        const dailyLimit = Number(campaign.daily_budget) - currentDailySpend;
        const totalLimit = Number(campaign.total_budget) - Number(campaign.spent_amount);
        const limit = Math.min(dailyLimit, totalLimit);
        
        const needed = Math.max(0, limit - Number(campaign.reserved_amount));
        if (needed > 0) {
          const toReserve = roundTnd(Math.min(needed, balance));
          if (toReserve > 0) {
            await this.reserveFunds(c, storeId, campaign.id, toReserve);
            account.balance = String(balance - toReserve);
          }
        }
      }
    };
    return client ? run(client) : transaction(run);
  }

  private async checkAndTriggerAutoRefill(client: PoolClient, storeId: string, accountId: string) {
    const res = await client.query(
      `SELECT auto_refill_enabled, auto_refill_threshold, auto_refill_amount, balance
       FROM pd_ads_account WHERE id = $1 FOR UPDATE`,
      [accountId]
    );
    const account = res.rows[0];
    if (account && account.auto_refill_enabled && Number(account.balance) < Number(account.auto_refill_threshold)) {
      const amount = Number(account.auto_refill_amount);
      if (amount > 0) {
        const updated = await client.query(
          `UPDATE pd_ads_account SET balance = balance + $2, updated_at = NOW() WHERE id = $1 RETURNING balance`,
          [accountId, amount]
        );
        const refId = pdId('adrfl');
        await client.query(
          `INSERT INTO pd_ads_refill_intent (id, account_id, store_id, gateway, amount, status, captured_at)
           VALUES ($1,$2,$3,'auto_refill',$4,'captured',NOW())`,
          [refId, accountId, storeId, amount]
        );
        await client.query(
          `INSERT INTO pd_ads_transaction (id, account_id, type, amount, balance_after, payment_reference, description)
           VALUES ($1,$2,'refill',$3,$4,$5,$6)`,
          [pdId('adtx'), accountId, amount, updated.rows[0].balance, refId, 'Automatic account auto-refill']
        );
        await this.allocateReservations(storeId, client);
      }
    }
  }

  private async getOrCreateAccount(storeId: string, client?: PoolClient) {
    const run = async (c: PoolClient) => {
      const existing = await c.query('SELECT * FROM pd_ads_account WHERE store_id = $1 FOR UPDATE', [storeId]);
      if (existing.rows[0]) return existing.rows[0];
      const created = await c.query(
        `INSERT INTO pd_ads_account (id, store_id) VALUES ($1,$2) RETURNING *`,
        [pdId('adacct'), storeId],
      );
      return created.rows[0];
    };
    return client ? run(client) : transaction(run);
  }

  async getAccount(storeId: string) {
    const account = await this.getOrCreateAccount(storeId);
    const stats = await query(
      `SELECT COALESCE(SUM(spent_amount),0)::text AS total_spend,
              COUNT(*) FILTER (WHERE status = 'active')::int AS active_campaigns
       FROM pd_ads_campaign WHERE store_id = $1`, [storeId],
    );
    return { ...account, ...stats.rows[0] };
  }

  async credit(storeId: string, amountInput: number, opts: { type?: string; description?: string; idempotencyKey?: string } = {}) {
    const amount = roundTnd(amountInput);
    if (amount <= 0) throw new PdValidationError('Ads credit amount must be positive');
    return transaction(async (c) => {
      const account = await this.getOrCreateAccount(storeId, c);
      if (opts.idempotencyKey) {
        const prior = await c.query('SELECT * FROM pd_ads_transaction WHERE idempotency_key = $1', [opts.idempotencyKey]);
        if (prior.rows[0]) return { account, transaction: prior.rows[0] };
      }
      const updated = await c.query(
        `UPDATE pd_ads_account SET balance = balance + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [account.id, amount],
      );
      const ledger = await c.query(
        `INSERT INTO pd_ads_transaction (id, account_id, type, amount, balance_after, idempotency_key, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [pdId('adtx'), account.id, opts.type || 'refill', amount, updated.rows[0].balance, opts.idempotencyKey || null, opts.description || 'Ads account credit'],
      );
      await this.allocateReservations(storeId, c);
      return { account: updated.rows[0], transaction: ledger.rows[0] };
    });
  }

  async listTransactions(storeId: string, limit = 50) {
    const account = await this.getOrCreateAccount(storeId);
    const result = await query(
      'SELECT * FROM pd_ads_transaction WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2',
      [account.id, Math.min(100, Math.max(1, limit))],
    );
    return result.rows;
  }

  async createCampaign(storeId: string, input: any) {
    const settings=await platformConfigService.getSettings();
    if(!settings.ads_enabled)throw new PdValidationError('PandaMarket Ads is currently disabled');
    const typeEnabled=input.campaign_type==='sponsored_product'?settings.ads_sponsored_products_enabled:input.campaign_type==='sponsored_brand'?settings.ads_sponsored_brands_enabled:settings.ads_sponsored_content_enabled;
    if(!typeEnabled)throw new PdValidationError('This advertising format is currently disabled');
    if(Number(input.daily_budget)<Number(settings.ads_min_daily_budget_tnd))throw new PdValidationError(`Minimum daily Ads budget is ${settings.ads_min_daily_budget_tnd} TND`);
    if(input.starts_at&&input.ends_at&&(new Date(input.ends_at).getTime()-new Date(input.starts_at).getTime())/86400000>Number(settings.ads_max_campaign_days))throw new PdValidationError(`Maximum campaign duration is ${settings.ads_max_campaign_days} days`);
    return transaction(async (c) => {
      const account = await this.getOrCreateAccount(storeId, c);
      if (!input.creative) throw new PdValidationError('A campaign creative is required');
      const creativeText=`${input.creative.title||''} ${input.creative.description||''} ${input.creative.cta_label||''}`.toLowerCase();
      const prohibited=String(settings.ads_prohibited_terms||'').split(',').map(term=>term.trim().toLowerCase()).filter(Boolean);
      const blocked=prohibited.find(term=>creativeText.includes(term));
      if(blocked)throw new PdValidationError('Creative contains prohibited content',{term:blocked});
      if(settings.ads_creative_image_required&&!input.creative.image_url)throw new PdValidationError('A creative image is required');
      if(String(input.creative.description||'').length>Number(settings.ads_max_creative_description_length))throw new PdValidationError(`Creative description cannot exceed ${settings.ads_max_creative_description_length} characters`);
      if (input.campaign_type === 'sponsored_product' && !input.creative.product_id) {
        throw new PdValidationError('Sponsored product campaigns require a product or service');
      }
      if (input.creative.product_id) {
        const product = await c.query<{ id:string; status:string }>(
          'SELECT id,status FROM pd_product WHERE id=$1 AND store_id=$2',
          [input.creative.product_id,storeId],
        );
        if (!product.rows[0]) throw new PdValidationError('The selected product does not belong to this store');
        if (product.rows[0].status !== 'published') throw new PdValidationError('Only published products and services can be sponsored');
      }
      if (!input.placement_ids?.length) throw new PdValidationError('Select at least one Ads placement');
      const validPlacements = await c.query<{ id:string }>(
        'SELECT id FROM pd_ads_placement WHERE id=ANY($1::varchar[]) AND enabled=TRUE',
        [input.placement_ids],
      );
      if (validPlacements.rows.length !== new Set(input.placement_ids).size) {
        throw new PdValidationError('One or more selected Ads placements are unavailable');
      }
      const campaignId = pdId('adcmp');
      const campaign = await c.query(
        `INSERT INTO pd_ads_campaign
          (id, account_id, store_id, name, campaign_type, objective, pricing_model, bid_amount, daily_budget, total_budget, starts_at, ends_at, targeting)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [campaignId, account.id, storeId, input.name, input.campaign_type, input.objective, input.pricing_model, input.bid_amount, input.daily_budget, input.total_budget, input.starts_at || null, input.ends_at || null, input.targeting || {}],
      );
      await c.query(
        `INSERT INTO pd_ads_creative (id, campaign_id, product_id, title, description, image_url, cta_label, destination_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pdId('adcrt'), campaignId, input.creative.product_id || null, input.creative.title, input.creative.description || null, input.creative.image_url || null, input.creative.cta_label || null, input.creative.destination_url || null],
      );
      for (const placementId of [...new Set<string>(input.placement_ids)]) {
        await c.query('INSERT INTO pd_ads_campaign_placement (campaign_id, placement_id) VALUES ($1,$2)', [campaignId, placementId]);
      }
      return campaign.rows[0];
    });
  }

  async listCampaigns(storeId: string) {
    const result = await query(
      `SELECT c.*, COALESCE(json_agg(cr.*) FILTER (WHERE cr.id IS NOT NULL), '[]') AS creatives
       FROM pd_ads_campaign c LEFT JOIN pd_ads_creative cr ON cr.campaign_id = c.id
       WHERE c.store_id = $1 GROUP BY c.id ORDER BY c.created_at DESC`, [storeId],
    );
    return result.rows;
  }

  async getCampaign(storeId: string, id: string) {
    const result = await query('SELECT * FROM pd_ads_campaign WHERE id = $1 AND store_id = $2', [id, storeId]);
    if (!result.rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Ads campaign not found');
    return result.rows[0];
  }

  async updateCampaign(storeId: string, id: string, input: any) {
    const current = await this.getCampaign(storeId, id);
    if (!['draft', 'rejected', 'paused'].includes(current.status)) throw new PdValidationError('This campaign cannot be edited in its current state');
    const result = await query(
      `UPDATE pd_ads_campaign SET name=COALESCE($3,name), daily_budget=COALESCE($4,daily_budget), total_budget=COALESCE($5,total_budget), bid_amount=COALESCE($6,bid_amount), starts_at=COALESCE($7,starts_at), ends_at=COALESCE($8,ends_at), targeting=COALESCE($9,targeting), updated_at=NOW()
       WHERE id=$1 AND store_id=$2 RETURNING *`,
      [id, storeId, input.name, input.daily_budget, input.total_budget, input.bid_amount, input.starts_at, input.ends_at, input.targeting],
    );
    return result.rows[0];
  }

  async transition(storeId: string, id: string, next: AdsCampaignStatus) {
    const settings=await platformConfigService.getSettings();
    const requestedNext=next;
    if(next==='pending_review'&&!settings.ads_moderation_required)next='approved';
    return transaction(async (c) => {
      const result = await c.query('SELECT * FROM pd_ads_campaign WHERE id=$1 AND store_id=$2 FOR UPDATE', [id, storeId]);
      const campaign = result.rows[0];
      if (!campaign) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Ads campaign not found');
      const allowedTargets=transitions[campaign.status as AdsCampaignStatus]||[];
      const transitionAllowed=allowedTargets.includes(next)||(requestedNext==='pending_review'&&next==='approved'&&allowedTargets.includes('pending_review'));
      if (!transitionAllowed) throw new PdValidationError(`Cannot move campaign from ${campaign.status} to ${next}`);
      if (['pending_review', 'approved', 'active'].includes(next)) {
        const account = await this.getOrCreateAccount(storeId, c);
        if (account.status !== 'active') throw new PdValidationError('Your Ads account is not active');
        if (Number(account.balance) + Number(account.reserved_balance || 0) <= 0) throw new PdValidationError('Refill your Ads account before advertising');
        if ((next === 'active' || next === 'scheduled') && Number(account.balance) + Number(campaign.reserved_amount || 0) < Math.min(Number(campaign.daily_budget), Number(campaign.total_budget) - Number(campaign.spent_amount))) {
          throw new PdValidationError('Your Ads balance is below the campaign launch requirement');
        }
      }
      if(next==='active'&&campaign.starts_at&&new Date(campaign.starts_at).getTime()>Date.now())next='scheduled';

      if (['paused', 'completed', 'cancelled', 'rejected'].includes(next)) {
        await this.releaseFunds(c, storeId, id, Number(campaign.reserved_amount));
      }

      const updated = await c.query(
        `UPDATE pd_ads_campaign SET status=$3::varchar,
          submitted_at=CASE WHEN $4::text='pending_review' THEN NOW() ELSE submitted_at END,
          approved_at=CASE WHEN $3::text='approved' THEN NOW() ELSE approved_at END,
          updated_at=NOW() WHERE id=$1 AND store_id=$2 RETURNING *`,
        [id, storeId, next, requestedNext],
      );

      if (next === 'active') {
        const account = await this.getOrCreateAccount(storeId, c);
        const dailySpend = await c.query<{ spend: string }>(
          `SELECT COALESCE(SUM(spend), 0)::text AS spend FROM pd_ads_daily_stat WHERE campaign_id = $1 AND stat_date = CURRENT_DATE`,
          [id]
        );
        const currentDailySpend = Number(dailySpend.rows[0]?.spend || 0);
        const dailyLimit = Number(campaign.daily_budget) - currentDailySpend;
        const totalLimit = Number(campaign.total_budget) - Number(campaign.spent_amount);
        const limit = Math.min(dailyLimit, totalLimit);

        const needed = Math.max(0, limit - Number(campaign.reserved_amount));
        if (needed > 0) {
          const toReserve = roundTnd(Math.min(needed, Number(account.balance)));
          if (toReserve > 0) {
            await this.reserveFunds(c, storeId, id, toReserve);
          }
        }
      }

      return updated.rows[0];
    });
  }

  async listPlacements() {
    return (await query('SELECT * FROM pd_ads_placement WHERE enabled = TRUE ORDER BY name')).rows;
  }

  async estimateDelivery(input:{pricing_model:'cpc'|'cpm'|'fixed_daily';bid_amount:number;daily_budget:number;total_budget:number;placement_ids:string[];starts_at?:string;ends_at?:string}) {
    const ids=[...new Set(input.placement_ids)];
    const result=await query<{id:string;name:string;default_price:string;default_pricing_model:string}>(
      `SELECT id,name,default_price,default_pricing_model FROM pd_ads_placement WHERE id=ANY($1::varchar[]) AND enabled=TRUE`,[ids],
    );
    if(result.rows.length!==ids.length)throw new PdValidationError('One or more selected Ads placements are unavailable');
    const matching=result.rows.filter(row=>row.default_pricing_model===input.pricing_model);
    const priceSource=matching.length?matching:result.rows;
    const configuredRates=priceSource.map(row=>Number(row.default_price)).filter(rate=>Number.isFinite(rate)&&rate>0).sort((a,b)=>a-b);
    const median=configuredRates.length?configuredRates[Math.floor(configuredRates.length/2)]:0;
    const recommendedBid=roundTnd(Math.max(median,0.001));
    const effectiveRate=roundTnd(Math.max(Number(input.bid_amount)||0,recommendedBid));
    const starts=input.starts_at?new Date(input.starts_at):new Date();
    const ends=input.ends_at?new Date(input.ends_at):null;
    const scheduledDays=ends?Math.max(1,Math.ceil((ends.getTime()-starts.getTime())/86400000)):Math.max(1,Math.ceil(Number(input.total_budget)/Number(input.daily_budget)));
    const fundedDays=Math.max(1,Math.ceil(Number(input.total_budget)/Number(input.daily_budget)));
    const estimatedDays=Math.min(scheduledDays,fundedDays);
    const spend=Math.min(Number(input.total_budget),Number(input.daily_budget)*estimatedDays);
    let metric:'clicks'|'impressions'|'days'='clicks';let units=0;
    if(input.pricing_model==='cpc')units=spend/effectiveRate;
    else if(input.pricing_model==='cpm'){metric='impressions';units=spend/effectiveRate*1000;}
    else{metric='days';units=spend/effectiveRate;}
    const low=Math.max(0,Math.floor(units*.7));const high=Math.max(low,Math.ceil(units*1.15));
    const recommendedDailyBudget=roundTnd(Math.max(recommendedBid*(input.pricing_model==='cpm'?5:input.pricing_model==='fixed_daily'?1:20),1));
    return {currency:'TND',metric,range:{low,high},estimated_days:estimatedDays,effective_rate:effectiveRate,recommended_bid:recommendedBid,recommended_daily_budget:recommendedDailyBudget,placement_count:result.rows.length,assumptions:'Directional estimate based on current placement rates and budget. Delivery is not guaranteed and varies with auction demand, targeting, and creative quality.'};
  }

  async getAnalytics(storeId: string, options: { from?: string; to?: string; campaignId?: string }) {
    const from = options.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = options.to || new Date().toISOString().slice(0, 10);
    const params: unknown[] = [storeId, from, to];
    const campaignFilter = options.campaignId ? 'AND c.id = $4' : '';
    if (options.campaignId) params.push(options.campaignId);
    const [summary, daily, campaigns] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(ds.impressions),0)::bigint AS impressions,
                COALESCE(SUM(ds.clicks),0)::bigint AS clicks,
                COALESCE(SUM(ds.conversions),0)::bigint AS conversions,
                COALESCE(SUM(ds.spend),0)::text AS spend,
                COALESCE(SUM(ds.revenue),0)::text AS revenue
         FROM pd_ads_campaign c LEFT JOIN pd_ads_daily_stat ds ON ds.campaign_id=c.id AND ds.stat_date BETWEEN $2::date AND $3::date
         WHERE c.store_id=$1 ${campaignFilter}`,
        params,
      ),
      query(
        `SELECT ds.stat_date, SUM(ds.impressions)::bigint AS impressions, SUM(ds.clicks)::bigint AS clicks,
                SUM(ds.conversions)::bigint AS conversions, SUM(ds.spend)::text AS spend, SUM(ds.revenue)::text AS revenue
         FROM pd_ads_daily_stat ds JOIN pd_ads_campaign c ON c.id=ds.campaign_id
         WHERE c.store_id=$1 AND ds.stat_date BETWEEN $2::date AND $3::date ${campaignFilter}
         GROUP BY ds.stat_date ORDER BY ds.stat_date`,
        params,
      ),
      query(
        `SELECT c.id,c.name,c.status,COALESCE(SUM(ds.impressions),0)::bigint AS impressions,
                COALESCE(SUM(ds.clicks),0)::bigint AS clicks,COALESCE(SUM(ds.conversions),0)::bigint AS conversions,
                COALESCE(SUM(ds.spend),0)::text AS spend,COALESCE(SUM(ds.revenue),0)::text AS revenue
         FROM pd_ads_campaign c LEFT JOIN pd_ads_daily_stat ds ON ds.campaign_id=c.id AND ds.stat_date BETWEEN $2::date AND $3::date
         WHERE c.store_id=$1 ${campaignFilter} GROUP BY c.id ORDER BY c.created_at DESC`,
        params,
      ),
    ]);
    const totals = summary.rows[0];
    const impressions = Number(totals.impressions || 0); const clicks = Number(totals.clicks || 0);
    const conversions = Number(totals.conversions || 0); const spend = Number(totals.spend || 0); const revenue = Number(totals.revenue || 0);
    return {
      range: { from, to },
      summary: { ...totals, ctr: impressions ? clicks / impressions : 0, average_cpc: clicks ? spend / clicks : 0, conversion_rate: clicks ? conversions / clicks : 0, roas: spend ? revenue / spend : 0 },
      daily: daily.rows,
      campaigns: campaigns.rows,
    };
  }

  private signDeliveryToken(payload: Record<string, unknown>): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', config.jwt.secret).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyDeliveryToken(token: string): Record<string, any> {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) throw new PdValidationError('Invalid ad event token');
    const expected = crypto.createHmac('sha256', config.jwt.secret).update(encoded).digest('base64url');
    const left = Buffer.from(signature); const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new PdValidationError('Invalid ad event token');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, any>;
    if (!payload.exp || Number(payload.exp) < Date.now()) throw new PdValidationError('Expired ad event token');
    return payload;
  }

  async deliver(placementKey: string, limit = 4, context: { locale?:string; category?:string; device?:string; audience?:string } = {}) {
    const settings=await platformConfigService.getSettings();
    if(!settings.ads_enabled)return [];
    const locale=context.locale?.trim().toLowerCase()||'all';
    const category=context.category?.trim().toLowerCase()||'';
    const device=context.device==='mobile'||context.device==='desktop'?context.device:'all';
    const audience=context.audience==='new'||context.audience==='returning'?context.audience:'all';
    const result = await query(
      `SELECT c.id AS campaign_id,c.campaign_type,c.pricing_model,c.bid_amount,c.daily_budget,c.total_budget,c.spent_amount,
              cr.id AS creative_id,cr.product_id,cr.title,cr.description,cr.image_url,cr.cta_label,cr.destination_url,
              p.id AS placement_id,p.placement_key,s.name AS store_name,s.subdomain AS store_subdomain
       FROM pd_ads_campaign c
       JOIN pd_ads_account a ON a.id=c.account_id AND a.status='active'
       JOIN pd_ads_campaign_placement cp ON cp.campaign_id=c.id
       JOIN pd_ads_placement p ON p.id=cp.placement_id AND p.enabled=TRUE AND p.placement_key=$1
       JOIN pd_store s ON s.id=c.store_id AND s.status NOT IN ('suspended','maintenance')
       JOIN LATERAL (SELECT * FROM pd_ads_creative WHERE campaign_id=c.id ORDER BY created_at LIMIT 1) cr ON TRUE
       WHERE c.status='active' AND c.reserved_amount>0
         AND (c.starts_at IS NULL OR c.starts_at<=NOW()) AND (c.ends_at IS NULL OR c.ends_at>NOW())
         AND COALESCE((SELECT spend FROM pd_ads_daily_stat WHERE campaign_id=c.id AND stat_date=CURRENT_DATE),0)
             <= c.daily_budget * GREATEST(0.10,LEAST(1,(EXTRACT(EPOCH FROM (NOW()-date_trunc('day',NOW())))/86400)))
                + GREATEST(c.bid_amount,0.001)
         AND (COALESCE(c.targeting->>'locale','all')='all' OR LOWER(c.targeting->>'locale')=$3)
         AND (COALESCE(c.targeting->>'device','all')='all' OR LOWER(c.targeting->>'device')=$4)
         AND (COALESCE(c.targeting->>'category','')='' OR LOWER(c.targeting->>'category')=$5)
         AND (COALESCE(c.targeting->>'audience','all')='all' OR LOWER(c.targeting->>'audience')=$6)
       ORDER BY c.bid_amount DESC, RANDOM() LIMIT $2`,
      [placementKey, Math.min(12, Math.max(1, limit)),locale,device,category,audience],
    );
    return result.rows.map((row) => ({
      ...row,
      sponsored: true,
      event_token: this.signDeliveryToken({ campaign_id:row.campaign_id,creative_id:row.creative_id,placement_id:row.placement_id,destination_url:row.destination_url,pricing_model:row.pricing_model,bid_amount:row.bid_amount,exp:Date.now()+30*60*1000 }),
    }));
  }

  async recordEvent(input: { token:string; eventType:'impression'|'click'; eventKey:string; sessionHash?:string; ipHash?:string; viewerStoreId?:string|null }) {
    const token = this.verifyDeliveryToken(input.token);
    const settings=await platformConfigService.getSettings();
    return transaction(async (c) => {
      const blocked = await c.query('SELECT 1 FROM pd_ads_blocked_ip WHERE ip_hash=$1', [input.ipHash || '']);
      if (blocked.rows[0]) return { recorded: false, fraud_blocked: true };

      if (input.ipHash && input.eventType === 'click') {
        const rapidClicks = await c.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM pd_ads_event WHERE ip_hash=$1 AND event_type='click' AND created_at>NOW()-INTERVAL '1 minute'`,
          [input.ipHash]
        );
        if (Number(rapidClicks.rows[0].count) >= 6) {
          await c.query(
            `INSERT INTO pd_ads_blocked_ip (ip_hash, reason) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [input.ipHash, 'Automated detection: Click rate exceeded 6 clicks/min']
          );
          return { recorded: false, fraud_blocked: true };
        }
      }

      const duplicate = await c.query('SELECT id FROM pd_ads_event WHERE event_key=$1', [input.eventKey]);
      if (duplicate.rows[0]) return { recorded:false, duplicate:true };
      const campaignResult = await c.query(
        `SELECT c.*,a.balance,a.id AS ads_account_id FROM pd_ads_campaign c JOIN pd_ads_account a ON a.id=c.account_id
         WHERE c.id=$1 FOR UPDATE OF c,a`, [token.campaign_id],
      );
      const campaign = campaignResult.rows[0];
      if (!campaign || campaign.status!=='active') throw new PdValidationError('Campaign is not active');
      if (input.viewerStoreId && input.viewerStoreId === campaign.store_id) return { recorded:false, self_click:true };
      if (input.sessionHash) {
        const duplicateWindow = input.eventType === 'click' ? '30 minutes' : '24 hours';
        const recent = await c.query(
          `SELECT id FROM pd_ads_event WHERE campaign_id=$1 AND creative_id=$2 AND event_type=$3 AND session_hash=$4 AND created_at>NOW()-$5::interval LIMIT 1`,
          [campaign.id,token.creative_id,input.eventType,input.sessionHash,duplicateWindow],
        );
        if (recent.rows[0]) return { recorded:false, duplicate:true };
        const frequency = await c.query<{ count:string }>(
          `SELECT COUNT(*)::text AS count FROM pd_ads_event WHERE campaign_id=$1 AND event_type='impression' AND session_hash=$2 AND created_at>NOW()-INTERVAL '24 hours'`,
          [campaign.id,input.sessionHash],
        );
        if (input.eventType === 'impression' && Number(frequency.rows[0].count) >= Number(settings.ads_frequency_cap_daily)) return { recorded:false, frequency_capped:true };
      }
      const rawCost = input.eventType==='click' && campaign.pricing_model==='cpc' ? Number(campaign.bid_amount)
        : input.eventType==='impression' && campaign.pricing_model==='cpm' ? Number(campaign.bid_amount)/1000 : 0;
      const cost = roundTnd(rawCost);
      const remaining = Number(campaign.reserved_amount);
      if (cost>remaining) {
        await c.query(`UPDATE pd_ads_campaign SET status='exhausted',updated_at=NOW() WHERE id=$1`, [campaign.id]);
        await this.releaseFunds(c, campaign.store_id, campaign.id, Number(campaign.reserved_amount));
        throw new PdValidationError('Campaign budget is exhausted');
      }
      await c.query(`INSERT INTO pd_ads_event (id,campaign_id,creative_id,placement_id,event_type,event_key,session_hash,ip_hash,cost)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [pdId('adevt'),campaign.id,token.creative_id,token.placement_id,input.eventType,input.eventKey,input.sessionHash||null,input.ipHash||null,cost]);
      await c.query(`INSERT INTO pd_ads_daily_stat (campaign_id,stat_date,impressions,clicks,spend) VALUES ($1,CURRENT_DATE,$2,$3,$4)
        ON CONFLICT (campaign_id,stat_date) DO UPDATE SET impressions=pd_ads_daily_stat.impressions+EXCLUDED.impressions,clicks=pd_ads_daily_stat.clicks+EXCLUDED.clicks,spend=pd_ads_daily_stat.spend+EXCLUDED.spend`,
        [campaign.id,input.eventType==='impression'?1:0,input.eventType==='click'?1:0,cost]);
      if (cost>0) {
        const account = await c.query(
          `UPDATE pd_ads_account SET reserved_balance=GREATEST(0, reserved_balance-$2),updated_at=NOW()
           WHERE id=$1 AND reserved_balance >= $2 RETURNING balance`,
          [campaign.ads_account_id,cost],
        );
        if (!account.rows[0]) {
          await c.query(`UPDATE pd_ads_campaign SET status='exhausted',updated_at=NOW() WHERE id=$1`, [campaign.id]);
          await this.releaseFunds(c, campaign.store_id, campaign.id, Number(campaign.reserved_amount));
          throw new PdValidationError('Campaign budget is exhausted');
        }
        const chargedCampaign = await c.query(
          `UPDATE pd_ads_campaign SET spent_amount=spent_amount+$2, reserved_amount=GREATEST(0, reserved_amount-$2), updated_at=NOW()
           WHERE id=$1 AND spent_amount+$2 <= total_budget RETURNING spent_amount`,
          [campaign.id,cost],
        );
        if (!chargedCampaign.rows[0]) throw new PdValidationError('Campaign budget is exhausted');
        await c.query(`INSERT INTO pd_ads_transaction (id,account_id,campaign_id,type,amount,balance_after,idempotency_key,description)
          VALUES ($1,$2,$3,'campaign_debit',$4,$5,$6,$7)`, [pdId('adtx'),campaign.ads_account_id,campaign.id,-cost,account.rows[0].balance,`event:${input.eventKey}`,`${input.eventType} charge`]);
        await this.checkAndTriggerAutoRefill(c, campaign.store_id, campaign.ads_account_id);
      }
      return { recorded:true, cost };
    });
  }

  async resolveClick(tokenValue:string):Promise<string> {
    const token=this.verifyDeliveryToken(tokenValue);
    const fallback='/hub';
    if(typeof token.destination_url!=='string'||!token.destination_url.trim())return fallback;
    const destination=token.destination_url.trim();
    if(destination.startsWith('/')&&!destination.startsWith('//'))return destination;
    try{
      const parsed=new URL(destination);
      const hubHost=new URL(config.hubDomain.startsWith('http')?config.hubDomain:`https://${config.hubDomain}`).hostname;
      if(parsed.protocol==='https:'&&(parsed.hostname===hubHost||parsed.hostname.endsWith(`.${hubHost}`)))return parsed.toString();
    }catch{ return fallback; }
    return fallback;
  }

  async findAttribution(client:PoolClient,input:{eventKey:string;campaignId:string;creativeId:string}) {
    const settings=await platformConfigService.getSettings();
    const result=await client.query<{campaign_id:string;event_id:string;event_type:string;product_id:string|null}>(
      `SELECT e.campaign_id,e.id AS event_id,e.event_type,cr.product_id
       FROM pd_ads_event e JOIN pd_ads_creative cr ON cr.id=e.creative_id
       WHERE e.event_key=$1 AND e.campaign_id=$2 AND e.creative_id=$3
         AND ((e.event_type='click' AND e.created_at>NOW()-($4::text||' days')::interval)
           OR (e.event_type='impression' AND e.created_at>NOW()-($5::text||' days')::interval))
       ORDER BY CASE WHEN e.event_type='click' THEN 0 ELSE 1 END LIMIT 1`,
      [input.eventKey,input.campaignId,input.creativeId,settings.ads_click_attribution_days,settings.ads_view_attribution_days],
    );
    return result.rows[0]||null;
  }

  async recognizeOrderConversion(orderId:string) {
    return transaction(async(c)=>{
      const conversions=await c.query<{id:string;campaign_id:string;revenue:string}>(
        `SELECT ac.id,ac.campaign_id,ac.revenue FROM pd_ads_conversion ac
         JOIN pd_order o ON o.id=ac.order_id
         WHERE ac.order_id=$1 AND ac.recognized_at IS NULL AND o.payment_status='captured'
         FOR UPDATE OF ac`,[orderId],
      );
      for(const conversion of conversions.rows){
        const recognized=await c.query(`UPDATE pd_ads_conversion SET recognized_at=NOW() WHERE id=$1 AND recognized_at IS NULL RETURNING id`,[conversion.id]);
        if(!recognized.rows[0])continue;
        await c.query(`INSERT INTO pd_ads_daily_stat (campaign_id,stat_date,conversions,revenue) VALUES ($1,CURRENT_DATE,1,$2)
          ON CONFLICT (campaign_id,stat_date) DO UPDATE SET conversions=pd_ads_daily_stat.conversions+1,revenue=pd_ads_daily_stat.revenue+EXCLUDED.revenue`,
          [conversion.campaign_id,conversion.revenue]);
      }
      return conversions.rows.length;
    });
  }

  async processLifecycle() {
    return transaction(async(c)=>{
      const campaignsToRelease = await c.query<{ id: string; store_id: string; reserved_amount: string }>(
        `SELECT id, store_id, reserved_amount FROM pd_ads_campaign WHERE reserved_amount > 0 FOR UPDATE`
      );
      for (const campaign of campaignsToRelease.rows) {
        await this.releaseFunds(c, campaign.store_id, campaign.id, Number(campaign.reserved_amount));
      }

      const activated=await c.query(`UPDATE pd_ads_campaign SET status='active',updated_at=NOW()
        WHERE status='scheduled' AND starts_at<=NOW() AND (ends_at IS NULL OR ends_at>NOW()) RETURNING id`);
      const completed=await c.query(`UPDATE pd_ads_campaign SET status='completed',updated_at=NOW()
        WHERE status IN ('active','scheduled','paused') AND ends_at IS NOT NULL AND ends_at<=NOW() RETURNING id`);
      const exhausted=await c.query(`UPDATE pd_ads_campaign SET status='exhausted',updated_at=NOW()
        WHERE status='active' AND spent_amount>=total_budget RETURNING id`);
      const anonymized=await c.query(`UPDATE pd_ads_event SET ip_hash=NULL,session_hash=NULL
        WHERE created_at<NOW()-INTERVAL '30 days' AND (ip_hash IS NOT NULL OR session_hash IS NOT NULL) RETURNING id`);
      const purged=await c.query(`DELETE FROM pd_ads_event WHERE created_at<NOW()-INTERVAL '90 days' RETURNING id`);
      const dailyCampaigns=await c.query<{id:string;account_id:string;bid_amount:string;daily_budget:string;total_budget:string;spent_amount:string;balance:string}>(
        `SELECT c.id,c.account_id,c.bid_amount,c.daily_budget,c.total_budget,c.spent_amount,a.balance
         FROM pd_ads_campaign c JOIN pd_ads_account a ON a.id=c.account_id
         WHERE c.status='active' AND c.pricing_model='fixed_daily' AND a.status='active'
           AND NOT EXISTS (SELECT 1 FROM pd_ads_transaction t WHERE t.campaign_id=c.id AND t.idempotency_key='fixed_daily:'||c.id||':'||CURRENT_DATE::text)
         FOR UPDATE OF c,a`,
      );
      let charged=0;
      for(const campaign of dailyCampaigns.rows){
        const amount=roundTnd(Math.min(Number(campaign.bid_amount),Number(campaign.daily_budget),Number(campaign.total_budget)-Number(campaign.spent_amount),Number(campaign.balance)));
        if(amount<=0){await c.query(`UPDATE pd_ads_campaign SET status='exhausted',updated_at=NOW() WHERE id=$1`,[campaign.id]);continue;}
        const account=await c.query(`UPDATE pd_ads_account SET balance=balance-$2,updated_at=NOW() WHERE id=$1 RETURNING balance`,[campaign.account_id,amount]);
        await c.query(`UPDATE pd_ads_campaign SET spent_amount=spent_amount+$2,updated_at=NOW() WHERE id=$1`,[campaign.id,amount]);
        await c.query(`INSERT INTO pd_ads_transaction (id,account_id,campaign_id,type,amount,balance_after,idempotency_key,description)
          VALUES ($1,$2,$3,'campaign_debit',$4,$5,$6,'Fixed daily campaign charge')`,[pdId('adtx'),campaign.account_id,campaign.id,-amount,account.rows[0].balance,`fixed_daily:${campaign.id}:${new Date().toISOString().slice(0,10)}`]);
        await c.query(`INSERT INTO pd_ads_daily_stat (campaign_id,stat_date,spend) VALUES ($1,CURRENT_DATE,$2)
          ON CONFLICT (campaign_id,stat_date) DO UPDATE SET spend=pd_ads_daily_stat.spend+EXCLUDED.spend`,[campaign.id,amount]);
        charged++;
      }

      const activeStores = await c.query<{ store_id: string }>(
        `SELECT DISTINCT store_id FROM pd_ads_campaign WHERE status = 'active'`
      );
      for (const row of activeStores.rows) {
        await this.allocateReservations(row.store_id, c);
      }

      return {activated:activated.rows,completed:completed.rows,exhausted:exhausted.rows,charged,anonymized:anonymized.rowCount||0,purged:purged.rowCount||0};
    }).then(async result=>{
      const stateIds=[...result.activated.map((row:any)=>({id:row.id,state:'active'})),...result.completed.map((row:any)=>({id:row.id,state:'completed'})),...result.exhausted.map((row:any)=>({id:row.id,state:'exhausted'}))];
      for(const item of stateIds)await this.sendCampaignStateAlert(item.id,item.state);
      await this.sendLowBalanceAlerts();
      return {...result,activated:result.activated.length,completed:result.completed.length,exhausted:result.exhausted.length};
    });
  }

  private async sendCampaignStateAlert(campaignId:string,state:string){
    const result=await query<{store_id:string;name:string;owner_id:string;email:string}>(`SELECT c.store_id,c.name,s.owner_id,u.email FROM pd_ads_campaign c JOIN pd_store s ON s.id=c.store_id JOIN pd_user u ON u.id=s.owner_id WHERE c.id=$1`,[campaignId]);const row=result.rows[0];if(!row)return;
    const key=`ads:${state}:${campaignId}`;const exists=await query(`SELECT id FROM pd_notifications WHERE user_id=$1 AND data->>'alert_key'=$2 LIMIT 1`,[row.owner_id,key]);if(exists.rows[0])return;
    const message=`Your Ads campaign “${row.name}” is now ${state}.`;
    await notificationService.create({user_id:row.owner_id,type:'ads_campaign_state',title:'PandaMarket Ads campaign update',message,data:{store_id:row.store_id,campaign_id:campaignId,state,alert_key:key}});
    await emailQueue.add('ads_campaign_state',{to:row.email,template:'generic_notification',subject:'PandaMarket Ads campaign update',variables:{title:'Campaign update',message,campaign_id:campaignId},scope:'store',store_id:row.store_id});
  }

  private async sendLowBalanceAlerts(){
    const rows=await query<{store_id:string;balance:string;owner_id:string;email:string}>(`SELECT a.store_id,a.balance::text,s.owner_id,u.email FROM pd_ads_account a JOIN pd_store s ON s.id=a.store_id JOIN pd_user u ON u.id=s.owner_id WHERE a.status='active' AND a.balance<5 AND EXISTS(SELECT 1 FROM pd_ads_campaign c WHERE c.store_id=a.store_id AND c.status IN ('active','scheduled','approved'))`);
    const day=new Date().toISOString().slice(0,10);
    for(const row of rows.rows){const key=`ads:low_balance:${row.store_id}:${day}`;const exists=await query(`SELECT id FROM pd_notifications WHERE user_id=$1 AND data->>'alert_key'=$2 LIMIT 1`,[row.owner_id,key]);if(exists.rows[0])continue;const message=`Your Ads balance is ${Number(row.balance).toFixed(3)} TND. Refill to avoid delivery interruption.`;await notificationService.create({user_id:row.owner_id,type:'ads_low_balance',title:'Low Ads balance',message,data:{store_id:row.store_id,balance:row.balance,alert_key:key}});await emailQueue.add('ads_low_balance',{to:row.email,template:'generic_notification',subject:'Low PandaMarket Ads balance',variables:{title:'Low Ads balance',message},scope:'store',store_id:row.store_id});}
  }

  async adminOverview() {
    const [summary, campaigns, accounts, daily, reviews] = await Promise.all([
      query(`SELECT COUNT(*)::int AS campaigns,
                    COUNT(*) FILTER (WHERE status='pending_review')::int AS pending_review,
                    COUNT(*) FILTER (WHERE status='active')::int AS active,
                    COALESCE(SUM(spent_amount),0)::text AS total_spend
             FROM pd_ads_campaign`),
      query(`SELECT c.*, s.name AS store_name, s.subdomain, s.custom_domain, s.is_verified, s.seller_type,
                    u.email AS owner_email, u.full_name AS owner_name,
                    a.balance AS account_balance, a.reserved_balance AS account_reserved_balance, a.status AS account_status,
                    COALESCE(json_agg(DISTINCT cr.*) FILTER (WHERE cr.id IS NOT NULL), '[]') AS creatives,
                    COALESCE(json_agg(DISTINCT p.name) FILTER (WHERE p.id IS NOT NULL), '[]') AS placement_names
             FROM pd_ads_campaign c
             JOIN pd_store s ON s.id=c.store_id
             JOIN pd_user u ON u.id=s.owner_id
             LEFT JOIN pd_ads_account a ON a.store_id=c.store_id
             LEFT JOIN pd_ads_creative cr ON cr.campaign_id=c.id
             LEFT JOIN pd_ads_campaign_placement cp ON cp.campaign_id=c.id
             LEFT JOIN pd_ads_placement p ON p.id=cp.placement_id
             GROUP BY c.id,s.name,s.subdomain,s.custom_domain,s.is_verified,s.seller_type,u.email,u.full_name,a.balance,a.reserved_balance,a.status
             ORDER BY c.created_at DESC LIMIT 100`),
      query(`SELECT a.*, s.name AS store_name,
                    COUNT(c.id)::int AS campaign_count,
                    COALESCE(SUM(c.spent_amount),0)::text AS total_spend
             FROM pd_ads_account a JOIN pd_store s ON s.id=a.store_id
             LEFT JOIN pd_ads_campaign c ON c.account_id=a.id
             GROUP BY a.id,s.name ORDER BY a.created_at DESC LIMIT 100`),
      query(`SELECT stat_date,SUM(impressions)::bigint AS impressions,SUM(clicks)::bigint AS clicks,SUM(conversions)::bigint AS conversions,SUM(spend)::text AS spend,SUM(revenue)::text AS revenue FROM pd_ads_daily_stat WHERE stat_date>=CURRENT_DATE-INTERVAL '30 days' GROUP BY stat_date ORDER BY stat_date`),
      query(`SELECT r.*,c.name AS campaign_name,s.name AS store_name,u.email AS reviewer_email FROM pd_ads_review r JOIN pd_ads_campaign c ON c.id=r.campaign_id JOIN pd_store s ON s.id=c.store_id LEFT JOIN pd_user u ON u.id=r.reviewer_user_id ORDER BY r.created_at DESC LIMIT 100`),
    ]);
    return { summary: summary.rows[0], campaigns: campaigns.rows, accounts: accounts.rows, daily:daily.rows, reviews:reviews.rows };
  }

  async reviewCampaign(campaignId: string, reviewerId: string, decision: 'approved'|'rejected'|'changes_requested', reason?: string) {
    return transaction(async (c) => {
      const found = await c.query('SELECT * FROM pd_ads_campaign WHERE id=$1 FOR UPDATE', [campaignId]);
      const campaign = found.rows[0];
      if (!campaign) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Ads campaign not found');
      if (campaign.status !== 'pending_review') throw new PdValidationError('Only pending campaigns can be reviewed');
      const next = decision === 'approved' ? 'approved' : 'rejected';
      const updated = await c.query(
        `UPDATE pd_ads_campaign SET status=$2::varchar, approved_at=CASE WHEN $2::text='approved' THEN NOW() ELSE NULL END,
          rejection_reason=CASE WHEN $2::text='rejected' THEN $3 ELSE NULL END, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [campaignId, next, reason || null],
      );
      await c.query(`INSERT INTO pd_ads_review (id,campaign_id,reviewer_user_id,decision,reason) VALUES ($1,$2,$3,$4,$5)`,
        [pdId('adrvw'), campaignId, reviewerId, decision, reason || null]);
      return updated.rows[0];
    });
  }

  async setAccountStatus(storeId: string, status: 'active'|'suspended') {
    const account = await this.getOrCreateAccount(storeId);
    const updated = await query('UPDATE pd_ads_account SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *', [account.id,status]);
    if (status === 'suspended') await query(`UPDATE pd_ads_campaign SET status='paused',updated_at=NOW() WHERE store_id=$1 AND status IN ('active','scheduled')`, [storeId]);
    return updated.rows[0];
  }

  async updatePlacement(id:string,input:{enabled?:boolean;defaultPrice?:number;defaultPricingModel?:'cpc'|'cpm'|'fixed_daily'}) {
    const result=await query(`UPDATE pd_ads_placement SET enabled=COALESCE($2,enabled),default_price=COALESCE($3,default_price),default_pricing_model=COALESCE($4,default_pricing_model),updated_at=NOW() WHERE id=$1 RETURNING *`,[id,input.enabled,input.defaultPrice,input.defaultPricingModel]);
    if(!result.rows[0])throw new PdNotFoundError(PdErrorCode.NOT_FOUND,'Ads placement not found');
    return result.rows[0];
  }

  async listAdminPlacements(){return (await query('SELECT * FROM pd_ads_placement ORDER BY name')).rows;}

  async bulkUpdatePlacementPricing(model:'cpc'|'cpm'|'fixed_daily',priceInput:number,placementIds?:string[]){
    const price=roundTnd(priceInput);if(price<=0)throw new PdValidationError('Placement price must be positive');
    const ids=placementIds?[...new Set(placementIds)]:null;
    const result=await query(`UPDATE pd_ads_placement SET default_pricing_model=$1,default_price=$2,updated_at=NOW()
      WHERE ($3::varchar[] IS NULL OR id=ANY($3::varchar[])) RETURNING *`,[model,price,ids]);
    if(ids&&result.rows.length!==ids.length)throw new PdValidationError('One or more Ads placements were not found');
    return result.rows;
  }

  async listAdminTransactions(limit=100){
    return (await query(`SELECT t.*,s.name AS store_name,c.name AS campaign_name,
      EXISTS(SELECT 1 FROM pd_ads_transaction r WHERE r.idempotency_key='refund:'||t.id) AS refunded
      FROM pd_ads_transaction t JOIN pd_ads_account a ON a.id=t.account_id
      JOIN pd_store s ON s.id=a.store_id LEFT JOIN pd_ads_campaign c ON c.id=t.campaign_id
      ORDER BY t.created_at DESC LIMIT $1`,[Math.min(250,Math.max(1,limit))])).rows;
  }

  async refundTransaction(transactionId:string,adminId:string,reason:string) {
    return transaction(async(c)=>{
      const original=await c.query(`SELECT t.*,a.store_id FROM pd_ads_transaction t JOIN pd_ads_account a ON a.id=t.account_id WHERE t.id=$1 FOR UPDATE OF t,a`,[transactionId]);
      const tx=original.rows[0];
      if(!tx||tx.type!=='campaign_debit'||Number(tx.amount)>=0)throw new PdValidationError('Only campaign debit transactions can be refunded');
      const key=`refund:${transactionId}`;const prior=await c.query('SELECT * FROM pd_ads_transaction WHERE idempotency_key=$1',[key]);if(prior.rows[0])return prior.rows[0];
      const amount=Math.abs(Number(tx.amount));const account=await c.query('UPDATE pd_ads_account SET balance=balance+$2,updated_at=NOW() WHERE id=$1 RETURNING balance',[tx.account_id,amount]);
      if(tx.campaign_id)await c.query('UPDATE pd_ads_campaign SET spent_amount=GREATEST(0,spent_amount-$2),updated_at=NOW() WHERE id=$1',[tx.campaign_id,amount]);
      return (await c.query(`INSERT INTO pd_ads_transaction (id,account_id,campaign_id,type,amount,balance_after,idempotency_key,description,metadata) VALUES ($1,$2,$3,'refund',$4,$5,$6,$7,$8) RETURNING *`,[pdId('adtx'),tx.account_id,tx.campaign_id,amount,account.rows[0].balance,key,reason,{admin_user_id:adminId,original_transaction_id:transactionId}])).rows[0];
    });
  }

  async listCoupons(){return (await query(`SELECT * FROM pd_ads_coupon ORDER BY created_at DESC LIMIT 100`)).rows;}

  async createCoupon(input:{code:string;amount:number;maxRedemptions:number;expiresAt?:string;enabled?:boolean},adminId:string){
    const code=input.code.trim().toUpperCase();const amount=roundTnd(input.amount);if(!/^[A-Z0-9_-]{4,40}$/.test(code))throw new PdValidationError('Coupon code must be 4-40 letters, numbers, dashes, or underscores');if(amount<=0)throw new PdValidationError('Coupon amount must be positive');
    return (await query(`INSERT INTO pd_ads_coupon(id,code,amount,max_redemptions,expires_at,enabled,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[pdId('adcoupon'),code,amount,input.maxRedemptions,input.expiresAt||null,input.enabled!==false,adminId])).rows[0];
  }

  async redeemCoupon(storeId:string,rawCode:string){return transaction(async c=>{const code=rawCode.trim().toUpperCase();const found=await c.query(`SELECT * FROM pd_ads_coupon WHERE code=$1 FOR UPDATE`,[code]);const coupon=found.rows[0];if(!coupon||!coupon.enabled||(coupon.expires_at&&new Date(coupon.expires_at).getTime()<=Date.now()))throw new PdValidationError('Coupon is invalid or expired');if(Number(coupon.redemption_count)>=Number(coupon.max_redemptions))throw new PdValidationError('Coupon redemption limit reached');const account=await this.getOrCreateAccount(storeId,c);const prior=await c.query(`SELECT transaction_id FROM pd_ads_coupon_redemption WHERE coupon_id=$1 AND store_id=$2`,[coupon.id,storeId]);if(prior.rows[0])throw new PdValidationError('This store already redeemed the coupon');const updated=await c.query(`UPDATE pd_ads_account SET balance=balance+$2,updated_at=NOW() WHERE id=$1 RETURNING balance`,[account.id,coupon.amount]);const tx=await c.query(`INSERT INTO pd_ads_transaction(id,account_id,type,amount,balance_after,idempotency_key,description,metadata) VALUES($1,$2,'promotional_credit',$3,$4,$5,$6,$7) RETURNING *`,[pdId('adtx'),account.id,coupon.amount,updated.rows[0].balance,`coupon:${coupon.id}:${storeId}`,`Promotional coupon ${coupon.code}`,{coupon_id:coupon.id,code:coupon.code}]);await c.query(`INSERT INTO pd_ads_coupon_redemption(coupon_id,store_id,transaction_id) VALUES($1,$2,$3)`,[coupon.id,storeId,tx.rows[0].id]);await c.query(`UPDATE pd_ads_coupon SET redemption_count=redemption_count+1 WHERE id=$1`,[coupon.id]);return tx.rows[0];});}

  async grantPromotionalCredit(storeId:string,amountInput:number,adminId:string,reason:string,idempotencyKey:string){
    const amount=roundTnd(amountInput);if(amount<=0)throw new PdValidationError('Promotional credit must be positive');
    return transaction(async(c)=>{const account=await this.getOrCreateAccount(storeId,c);const prior=await c.query('SELECT * FROM pd_ads_transaction WHERE idempotency_key=$1',[idempotencyKey]);if(prior.rows[0])return prior.rows[0];const updated=await c.query('UPDATE pd_ads_account SET balance=balance+$2,updated_at=NOW() WHERE id=$1 RETURNING balance',[account.id,amount]);return(await c.query(`INSERT INTO pd_ads_transaction (id,account_id,type,amount,balance_after,idempotency_key,description,metadata) VALUES ($1,$2,'promotional_credit',$3,$4,$5,$6,$7) RETURNING *`,[pdId('adtx'),account.id,amount,updated.rows[0].balance,idempotencyKey,reason,{admin_user_id:adminId}])).rows[0];});
  }

  async adjustAccount(storeId: string, amountInput: number, adminId: string, reason: string, idempotencyKey: string) {
    const amount = roundTnd(amountInput);
    if (amount === 0) throw new PdValidationError('Adjustment amount cannot be zero');
    return transaction(async (c) => {
      const account = await this.getOrCreateAccount(storeId, c);
      const prior = await c.query('SELECT * FROM pd_ads_transaction WHERE idempotency_key=$1', [idempotencyKey]);
      if (prior.rows[0]) return { account, transaction: prior.rows[0] };
      if (Number(account.balance) + amount < 0) throw new PdValidationError('Adjustment would make the Ads balance negative');
      const updated = await c.query('UPDATE pd_ads_account SET balance=balance+$2,updated_at=NOW() WHERE id=$1 RETURNING *', [account.id, amount]);
      const ledger = await c.query(
        `INSERT INTO pd_ads_transaction (id,account_id,type,amount,balance_after,idempotency_key,description,metadata)
         VALUES ($1,$2,'admin_adjustment',$3,$4,$5,$6,$7) RETURNING *`,
        [pdId('adtx'),account.id,amount,updated.rows[0].balance,idempotencyKey,reason,{ admin_user_id:adminId }],
      );
      return { account:updated.rows[0], transaction:ledger.rows[0] };
    });
  }
}

export const adsService = new AdsService();
