'use client';

import { fetchWithCsrf } from '@/lib/api';
import { Check, Loader2, Megaphone, RefreshCw, WalletCards, X, ShieldAlert, Settings, DollarSign, Layers, Users, History, BarChart3 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdsPlatformChart } from '../../../components/admin/AdsPlatformChart';

type Campaign={id:string;name:string;store_name:string;campaign_type:string;status:string;total_budget:string;spent_amount:string;creatives:Array<{title:string}>};
type Account={id:string;store_id:string;store_name:string;balance:string;reserved_balance:string;campaign_count:number;total_spend:string;status:string};
type Summary={campaigns:number;pending_review:number;active:number;total_spend:string};
type DailyStat={stat_date:string;impressions:string;clicks:string;conversions:string;spend:string;revenue:string};
type Review={id:string;campaign_name:string;store_name:string;decision:string;reason?:string;reviewer_email?:string;created_at:string};
type Placement={id:string;name:string;placement_key:string;format:string;enabled:boolean;default_price:string;default_pricing_model:string};
type AdsCoupon={id:string;code:string;amount:string;max_redemptions:number;redemption_count:number;expires_at?:string;enabled:boolean};
type AdsTransaction={id:string;type:string;amount:string;balance_after:string;description?:string;created_at:string;store_name:string;campaign_name?:string;refunded:boolean};
type AdsConfig={ads_enabled:boolean;ads_moderation_required:boolean;ads_min_refill_tnd:number;ads_max_refill_tnd:number;ads_min_daily_budget_tnd:number;ads_max_campaign_days:number;ads_frequency_cap_daily:number;ads_click_attribution_days:number;ads_view_attribution_days:number;ads_sponsored_products_enabled:boolean;ads_sponsored_brands_enabled:boolean;ads_sponsored_content_enabled:boolean;ads_prohibited_terms:string;ads_creative_image_required:boolean;ads_max_creative_description_length:number};
type BlockedIP={ip_hash:string;reason?:string;blocked_at:string};
type AdminAdsTab = 'overview' | 'moderation' | 'advertisers' | 'transactions' | 'placements' | 'pricing' | 'fraud' | 'configuration';

const money=(v:string)=>`${Number(v||0).toFixed(3)} TND`;

export default function AdminAdsPage(){
 const [activeTab, setActiveTab] = useState<AdminAdsTab>('overview');
 const [campaigns,setCampaigns]=useState<Campaign[]>([]),[accounts,setAccounts]=useState<Account[]>([]),[placements,setPlacements]=useState<Placement[]>([]),[transactions,setTransactions]=useState<AdsTransaction[]>([]),[coupons,setCoupons]=useState<AdsCoupon[]>([]),[adsConfig,setAdsConfig]=useState<AdsConfig|null>(null),[reviews,setReviews]=useState<Review[]>([]),[summary,setSummary]=useState<Summary|null>(null),[daily,setDaily]=useState<DailyStat[]>([]),[blockedIPs,setBlockedIPs]=useState<BlockedIP[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');

 const load=useCallback(async()=>{setLoading(true);setError('');try{const [r,pr,cr,tr,cor,fr]=await Promise.all([fetchWithCsrf('/api/pd/admin/ads',{credentials:'include'}),fetchWithCsrf('/api/pd/admin/ads/placements',{credentials:'include'}),fetchWithCsrf('/api/pd/admin/ads/config',{credentials:'include'}),fetchWithCsrf('/api/pd/admin/ads/transactions?limit=100',{credentials:'include'}),fetchWithCsrf('/api/pd/admin/ads/coupons',{credentials:'include'}),fetchWithCsrf('/api/pd/admin/ads/fraud/blocked-ips',{credentials:'include'})]);const [d,pd,cd,td,cod,fd]=await Promise.all([r.json(),pr.json(),cr.json(),tr.json(),cor.json(),fr.json()]);if(!r.ok||!pr.ok||!cr.ok||!tr.ok||!cor.ok||!fr.ok)throw new Error(d.error?.message||pd.error?.message||'Unable to load Ads');setCampaigns(d.campaigns||[]);setAccounts(d.accounts||[]);setPlacements(pd.placements||[]);setTransactions(td.transactions||[]);setCoupons(cod.coupons||[]);setAdsConfig(cd.config||null);setReviews(d.reviews||[]);setSummary(d.summary);setDaily(d.daily||[]);setBlockedIPs(fd.blocked_ips||[]);}catch(e){setError(e instanceof Error?e.message:'Unable to load Ads');}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);

 const updateConfig=async(patch:Partial<AdsConfig>)=>{const r=await fetchWithCsrf('/api/pd/admin/ads/config',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});if(!r.ok){const d=await r.json();setError(d.error?.message||'Configuration update failed');return;}await load();};
 const review=async(id:string,decision:'approved'|'rejected')=>{const reason=decision==='rejected'?window.prompt('Rejection reason')||'':'';if(decision==='rejected'&&!reason)return;const r=await fetchWithCsrf(`/api/pd/admin/ads/campaigns/${id}/review`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,reason:reason||undefined})});const d=await r.json();if(!r.ok){setError(d.error?.message||'Review failed');return;}await load();};
 const credit=async(account:Account)=>{const raw=window.prompt(`Promotional credit for ${account.store_name}:`);const amount=Number(raw);const reason=window.prompt('Credit reason:');if(!Number.isFinite(amount)||amount<=0||!reason)return;const r=await fetchWithCsrf('/api/pd/admin/ads/credits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({store_id:account.store_id,amount,reason,idempotency_key:`promo-${account.id}-${Date.now()}`})});if(!r.ok){const d=await r.json();setError(d.error?.message||'Credit failed');return;}await load();};
 const setStatus=async(account:Account)=>{const status=account.status==='active'?'suspended':'active';if(!window.confirm(`${status==='suspended'?'Suspend':'Reactivate'} ${account.store_name}'s Ads account?`))return;const r=await fetchWithCsrf(`/api/pd/admin/ads/accounts/${account.store_id}/status`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});if(!r.ok){const d=await r.json();setError(d.error?.message||'Status update failed');return;}await load();};
 const bulkPricing=async()=>{const model=window.prompt('Pricing model: cpc, cpm, or fixed_daily','cpc');if(!model||!['cpc','cpm','fixed_daily'].includes(model))return;const raw=window.prompt(`Default ${model.toUpperCase()} rate:`);const price=Number(raw);if(!Number.isFinite(price)||price<=0)return;const r=await fetchWithCsrf('/api/pd/admin/ads/placements/bulk-pricing',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({pricing_model:model,default_price:price})});if(!r.ok){const d=await r.json();setError(d.error?.message||'Bulk pricing update failed');return;}await load();};
 const updatePlacement=async(placement:Placement,patch:Record<string,unknown>)=>{const r=await fetchWithCsrf(`/api/pd/admin/ads/placements/${placement.id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});if(!r.ok){const d=await r.json();setError(d.error?.message||'Placement update failed');return;}await load();};
 const createCoupon=async()=>{const code=window.prompt('Coupon code (letters/numbers/dashes):')?.trim();if(!code)return;const amount=Number(window.prompt('Promotional credit amount (TND):'));const max=Number(window.prompt('Maximum redemptions:','1'));if(!Number.isFinite(amount)||amount<=0||!Number.isInteger(max)||max<=0)return;const r=await fetchWithCsrf('/api/pd/admin/ads/coupons',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,amount,max_redemptions:max})});const d=await r.json();if(!r.ok){setError(d.error?.message||'Coupon creation failed');return;}await load();};
 const refund=async(transaction:AdsTransaction)=>{const reason=window.prompt(`Refund ${money(String(Math.abs(Number(transaction.amount))))} to ${transaction.store_name}. Reason:`);if(!reason)return;const r=await fetchWithCsrf(`/api/pd/admin/ads/transactions/${transaction.id}/refund`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});const d=await r.json();if(!r.ok){setError(d.error?.message||'Refund failed');return;}await load();};
 const adjust=async(account:Account)=>{const raw=window.prompt(`Adjustment for ${account.store_name} (negative debits):`);if(!raw)return;const amount=Number(raw);const reason=window.prompt('Reason for adjustment:');if(!Number.isFinite(amount)||amount===0||!reason)return;const r=await fetchWithCsrf('/api/pd/admin/ads/accounts/adjust',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({store_id:account.store_id,amount,reason,idempotency_key:`admin-${account.id}-${Date.now()}`})});const d=await r.json();if(!r.ok){setError(d.error?.message||'Adjustment failed');return;}await load();};
 const blockIP=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);const ip_hash=fd.get('ip_hash')?.toString();const reason=fd.get('reason')?.toString();if(!ip_hash)return;const r=await fetchWithCsrf('/api/pd/admin/ads/fraud/block-ip',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip_hash,reason})});const d=await r.json();if(!r.ok){setError(d.error?.message||'Block IP failed');return;}(e.target as HTMLFormElement).reset();await load();};
 const unblockIP=async(ipHash:string)=>{const r=await fetchWithCsrf(`/api/pd/admin/ads/fraud/blocked-ips/${encodeURIComponent(ipHash)}`,{method:'DELETE',credentials:'include'});if(!r.ok){const d=await r.json();setError(d.error?.message||'Unblock failed');return;}await load();};

 const tabs: Array<{ id: AdminAdsTab; label: string; icon: any; count?: number }> = [
   { id: 'overview', label: 'Overview', icon: BarChart3 },
   { id: 'moderation', label: 'Moderation', icon: Check, count: summary?.pending_review || 0 },
   { id: 'advertisers', label: 'Advertisers', icon: Users },
   { id: 'transactions', label: 'Transactions', icon: History },
   { id: 'placements', label: 'Placements', icon: Layers },
   { id: 'pricing', label: 'Pricing', icon: DollarSign },
   { id: 'fraud', label: 'Fraud & Safety', icon: ShieldAlert, count: blockedIPs.length },
   { id: 'configuration', label: 'Configuration', icon: Settings },
 ];

 return (
   <div className="space-y-6">
     <div className="flex items-start justify-between">
       <div>
         <p className="text-xs font-black uppercase tracking-widest text-[#B91C1C]">Advertising operations</p>
         <h1 className="mt-1 text-3xl font-black">PandaMarket Ads</h1>
         <p className="mt-1 text-sm text-gray-500">Moderate campaigns and control prepaid advertiser accounts.</p>
       </div>
       <button onClick={() => load()} className="rounded-xl border bg-white p-3 shadow-sm hover:bg-gray-50">
         <RefreshCw className="h-4 w-4" />
       </button>
     </div>

     {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

     {/* 8-Tab Navigation Header */}
     <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
       {tabs.map((tab) => {
         const Icon = tab.icon;
         const isActive = activeTab === tab.id;
         return (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
               isActive
                 ? 'bg-slate-900 text-white shadow-md'
                 : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
             }`}
           >
             <Icon className="h-3.5 w-3.5" />
             {tab.label}
             {Boolean(tab.count) && (
               <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-amber-100 text-amber-800'}`}>
                 {tab.count}
               </span>
             )}
           </button>
         );
       })}
     </div>

     {loading ? (
       <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
     ) : (
       <>
         {/* TAB 1: OVERVIEW */}
         {activeTab === 'overview' && (
           <div className="space-y-6">
             <div className="grid gap-4 md:grid-cols-4">
               {[
                 ['Campaigns', summary?.campaigns || 0, Megaphone],
                 ['Pending review', summary?.pending_review || 0, Megaphone],
                 ['Active', summary?.active || 0, Megaphone],
                 ['Ads revenue', money(summary?.total_spend || '0'), WalletCards],
               ].map(([l, v, I]) => (
                 <div key={String(l)} className="rounded-2xl border bg-white p-5 shadow-sm">
                   <I className="h-5 w-5 text-[#B91C1C]" />
                   <p className="mt-3 text-xs font-bold uppercase text-gray-400">{String(l)}</p>
                   <p className="text-2xl font-black">{String(v)}</p>
                 </div>
               ))}
             </div>
             <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
               <div className="border-b p-5">
                 <h2 className="font-black">Platform Ads performance</h2>
                 <p className="text-xs text-gray-500">Spend, attributed revenue, and valid clicks over the last 30 days.</p>
               </div>
               <AdsPlatformChart daily={daily} />
             </section>
           </div>
         )}

         {/* TAB 2: MODERATION */}
         {activeTab === 'moderation' && (
           <div className="space-y-6">
             <section className="rounded-2xl border bg-white shadow-sm">
               <div className="border-b p-5"><h2 className="font-black">Campaign moderation queue</h2></div>
               <div className="divide-y">
                 {campaigns.map((c) => (
                   <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                     <div>
                       <p className="font-black">{c.name}</p>
                       <p className="text-xs text-gray-500">{c.store_name} · {c.campaign_type.replaceAll('_', ' ')} · {c.creatives?.[0]?.title || 'No creative'}</p>
                       <p className="mt-1 text-xs font-semibold">{money(c.spent_amount)} / {money(c.total_budget)}</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase">{c.status.replaceAll('_', ' ')}</span>
                       {c.status === 'pending_review' && (
                         <>
                           <button onClick={() => review(c.id, 'approved')} className="rounded-lg bg-emerald-600 p-2 text-white" aria-label="Approve"><Check className="h-4 w-4" /></button>
                           <button onClick={() => review(c.id, 'rejected')} className="rounded-lg bg-red-600 p-2 text-white" aria-label="Reject"><X className="h-4 w-4" /></button>
                         </>
                       )}
                     </div>
                   </div>
                 ))}
                 {campaigns.length === 0 && <p className="p-8 text-center text-gray-400">No campaigns found.</p>}
               </div>
             </section>
             <section className="rounded-2xl border bg-white shadow-sm">
               <div className="border-b p-5"><h2 className="font-black">Moderation review history</h2></div>
               <div className="divide-y">
                 {reviews.map((r) => (
                   <div key={r.id} className="p-5">
                     <div className="flex justify-between gap-4">
                       <div>
                         <p className="font-black">{r.campaign_name}</p>
                         <p className="text-xs text-gray-500">{r.store_name} · {r.reviewer_email || 'System'}</p>
                       </div>
                       <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase">{r.decision.replaceAll('_', ' ')}</span>
                     </div>
                     {r.reason && <p className="mt-2 text-sm text-gray-600">{r.reason}</p>}
                   </div>
                 ))}
                 {reviews.length === 0 && <p className="p-8 text-center text-gray-400">No reviews yet.</p>}
               </div>
             </section>
           </div>
         )}

         {/* TAB 3: ADVERTISERS */}
         {activeTab === 'advertisers' && (
           <section className="rounded-2xl border bg-white shadow-sm">
             <div className="border-b p-5"><h2 className="font-black">Advertiser accounts</h2><p className="text-xs text-gray-500">Inspect seller balances, status, promotional credits, and manual adjustments.</p></div>
             <div className="divide-y">
               {accounts.map((a) => (
                 <div key={a.id} className="flex items-center justify-between p-5">
                   <div>
                     <p className="font-black">{a.store_name}</p>
                     <p className="text-xs text-gray-500">{a.campaign_count} campaigns · {money(a.total_spend)} spent</p>
                   </div>
                   <div className="flex items-center gap-4">
                     <p className="font-black">{money(a.balance)}</p>
                     <button onClick={() => adjust(a)} className="rounded-lg border px-3 py-2 text-xs font-black hover:bg-gray-50">Adjust</button>
                     <button onClick={() => credit(a)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Promo credit</button>
                     <button onClick={() => setStatus(a)} className={`rounded-lg px-3 py-2 text-xs font-black ${a.status === 'active' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                       {a.status === 'active' ? 'Suspend' : 'Reactivate'}
                     </button>
                   </div>
                 </div>
               ))}
               {accounts.length === 0 && <p className="p-8 text-center text-gray-400">No advertiser accounts found.</p>}
             </div>
           </section>
         )}

         {/* TAB 4: TRANSACTIONS */}
         {activeTab === 'transactions' && (
           <div className="space-y-6">
             <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
               <div className="border-b p-5"><h2 className="font-black">Ads transactions and refunds</h2><p className="text-xs text-gray-500">Inspect individual ledger entries and refund eligible campaign charges.</p></div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                     <tr><th className="p-4">Date</th><th className="p-4">Advertiser</th><th className="p-4">Campaign</th><th className="p-4">Type</th><th className="p-4">Amount</th><th className="p-4">Action</th></tr>
                   </thead>
                   <tbody className="divide-y">
                     {transactions.map((t) => (
                       <tr key={t.id}>
                         <td className="p-4 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                         <td className="p-4 font-bold">{t.store_name}</td>
                         <td className="p-4 text-gray-500">{t.campaign_name || '—'}</td>
                         <td className="p-4 font-bold capitalize">{t.type.replaceAll('_', ' ')}</td>
                         <td className={`p-4 font-black ${Number(t.amount) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(t.amount)}</td>
                         <td className="p-4">
                           {t.type === 'campaign_debit' && Number(t.amount) < 0 ? (
                             <button disabled={t.refunded} onClick={() => refund(t)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:bg-gray-100 disabled:text-gray-400">
                               {t.refunded ? 'Refunded' : 'Refund debit'}
                             </button>
                           ) : (
                             <span className="text-xs text-gray-400">Not refundable</span>
                           )}
                         </td>
                       </tr>
                     ))}
                     {transactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No transactions.</td></tr>}
                   </tbody>
                 </table>
               </div>
             </section>
             <section className="rounded-2xl border bg-white shadow-sm">
               <div className="flex items-center justify-between border-b p-5">
                 <div><h2 className="font-black">Promotional coupons</h2><p className="text-xs text-gray-500">Bounded Ads credits redeemable once per store.</p></div>
                 <button onClick={createCoupon} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-white hover:bg-amber-600">Create coupon</button>
               </div>
               <div className="divide-y">
                 {coupons.map((c) => (
                   <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                     <div>
                       <p className="font-black">{c.code}</p>
                       <p className="text-xs text-gray-500">{money(c.amount)} · {c.redemption_count}/{c.max_redemptions} redeemed{c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ''}</p>
                     </div>
                     <span className={`rounded-full px-3 py-1 text-xs font-black ${c.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{c.enabled ? 'Enabled' : 'Disabled'}</span>
                   </div>
                 ))}
                 {coupons.length === 0 && <p className="p-8 text-center text-gray-400">No coupons.</p>}
               </div>
             </section>
           </div>
         )}

         {/* TAB 5: PLACEMENTS */}
         {activeTab === 'placements' && (
           <section className="rounded-2xl border bg-white shadow-sm">
             <div className="border-b p-5"><h2 className="font-black">Marketplace ad placements</h2><p className="text-xs text-gray-500">Enable or disable specific placement slots on the homepage, category pages, and search results.</p></div>
             <div className="divide-y">
               {placements.map((p) => (
                 <div key={p.id} className="flex items-center justify-between p-5">
                   <div>
                     <p className="font-black">{p.name}</p>
                     <p className="text-xs text-gray-500">Key: <code className="rounded bg-gray-100 px-1 py-0.5">{p.placement_key}</code> · Format: <span className="font-bold uppercase">{p.format}</span></p>
                   </div>
                   <button onClick={() => updatePlacement(p, { enabled: !p.enabled })} className={`rounded-lg px-4 py-2 text-xs font-black ${p.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                     {p.enabled ? 'Enabled' : 'Disabled'}
                   </button>
                 </div>
               ))}
               {placements.length === 0 && <p className="p-8 text-center text-gray-400">No placements defined.</p>}
             </div>
           </section>
         )}

         {/* TAB 6: PRICING */}
         {activeTab === 'pricing' && (
           <section className="rounded-2xl border bg-white shadow-sm">
             <div className="border-b p-5">
               <div className="flex items-center justify-between gap-3">
                 <div><h2 className="font-black">Placement rates & default pricing</h2><p className="text-xs text-gray-500">Manage rates per placement or apply bulk default updates across all placements.</p></div>
                 <button onClick={bulkPricing} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">Bulk pricing update</button>
               </div>
             </div>
             <div className="divide-y">
               {placements.map((p) => (
                 <div key={p.id} className="grid items-center gap-3 p-5 md:grid-cols-[1fr_140px_140px]">
                   <div>
                     <p className="font-black">{p.name}</p>
                     <p className="text-xs text-gray-500">{p.placement_key} · {p.format}</p>
                   </div>
                   <select value={p.default_pricing_model} onChange={(e) => updatePlacement(p, { default_pricing_model: e.target.value })} className="rounded-lg border p-2 text-sm">
                     <option value="cpc">CPC</option>
                     <option value="cpm">CPM</option>
                     <option value="fixed_daily">Fixed daily</option>
                   </select>
                   <input aria-label={`${p.name} price`} type="number" min="0" step="0.001" defaultValue={p.default_price} onBlur={(e) => { if (e.target.value !== p.default_price) updatePlacement(p, { default_price: Number(e.target.value) }); }} className="rounded-lg border p-2 text-sm" />
                 </div>
               ))}
               {placements.length === 0 && <p className="p-8 text-center text-gray-400">No placements available.</p>}
             </div>
           </section>
         )}

         {/* TAB 7: FRAUD */}
         {activeTab === 'fraud' && (
           <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
             <div className="border-b p-5"><h2 className="font-black">Fraud & Safety controls</h2><p className="text-xs text-gray-500">Manage blocked IP hashes to prevent automated click fraud and invalid traffic.</p></div>
             <div className="p-5 border-b bg-gray-50">
               <form onSubmit={blockIP} className="flex flex-wrap gap-3">
                 <input name="ip_hash" placeholder="IP Hash identifier" required className="flex-1 min-w-[200px] rounded-lg border p-2.5 text-sm" />
                 <input name="reason" placeholder="Reason (e.g. Rapid click burst)" className="flex-1 min-w-[200px] rounded-lg border p-2.5 text-sm" />
                 <button type="submit" className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800">Block IP</button>
               </form>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                   <tr><th className="p-4">IP Hash</th><th className="p-4">Reason</th><th className="p-4">Blocked At</th><th className="p-4">Action</th></tr>
                 </thead>
                 <tbody className="divide-y">
                   {blockedIPs.map((b) => (
                     <tr key={b.ip_hash}>
                       <td className="p-4 font-bold font-mono text-xs">{b.ip_hash}</td>
                       <td className="p-4 text-gray-500">{b.reason || '—'}</td>
                       <td className="p-4 text-gray-500">{new Date(b.blocked_at).toLocaleString()}</td>
                       <td className="p-4">
                         <button onClick={() => unblockIP(b.ip_hash)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">Unblock</button>
                       </td>
                     </tr>
                   ))}
                   {blockedIPs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No blocked IP hashes.</td></tr>}
                 </tbody>
               </table>
             </div>
           </section>
         )}

         {/* TAB 8: CONFIGURATION */}
         {activeTab === 'configuration' && adsConfig && (
           <section className="rounded-2xl border bg-white p-5 shadow-sm">
             <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
               <div>
                 <h2 className="font-black">Global Ads platform settings</h2>
                 <p className="text-xs text-gray-500">Controls delivery, campaign limits, attribution windows, and seller creation access.</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => updateConfig({ ads_enabled: !adsConfig.ads_enabled })} className={`rounded-lg px-4 py-2 text-xs font-black ${adsConfig.ads_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                   {adsConfig.ads_enabled ? 'Ads enabled' : 'Ads disabled'}
                 </button>
                 <button onClick={() => updateConfig({ ads_moderation_required: !adsConfig.ads_moderation_required })} className="rounded-lg border px-4 py-2 text-xs font-black hover:bg-gray-50">
                   Moderation: {adsConfig.ads_moderation_required ? 'required' : 'automatic'}
                 </button>
               </div>
             </div>
             <div className="mt-4 flex flex-wrap gap-2">
               {([['Sponsored products', 'ads_sponsored_products_enabled'], ['Sponsored brands', 'ads_sponsored_brands_enabled'], ['Sponsored content', 'ads_sponsored_content_enabled']] as const).map(([label, key]) => (
                 <button key={key} onClick={() => updateConfig({ [key]: !adsConfig[key] })} className={`rounded-full px-4 py-2 text-xs font-black ${adsConfig[key] ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                   {label}: {adsConfig[key] ? 'on' : 'off'}
                 </button>
               ))}
             </div>
             <div className="mt-4 grid gap-3 md:grid-cols-2">
               <label className="text-xs font-bold text-gray-500">
                 Prohibited terms (comma separated)
                 <textarea defaultValue={adsConfig.ads_prohibited_terms} onBlur={(e) => { if (e.target.value !== adsConfig.ads_prohibited_terms) updateConfig({ ads_prohibited_terms: e.target.value }); }} className="mt-1 w-full rounded-lg border p-2 text-sm" />
               </label>
               <div className="space-y-3">
                 <button onClick={() => updateConfig({ ads_creative_image_required: !adsConfig.ads_creative_image_required })} className="rounded-lg border px-4 py-2 text-xs font-black hover:bg-gray-50">
                   Creative image: {adsConfig.ads_creative_image_required ? 'required' : 'optional'}
                 </button>
                 <label className="block text-xs font-bold text-gray-500">
                   Maximum description length
                   <input type="number" min="50" max="5000" defaultValue={adsConfig.ads_max_creative_description_length} onBlur={(e) => updateConfig({ ads_max_creative_description_length: Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-2 text-sm" />
                 </label>
               </div>
             </div>
             <div className="mt-4 grid gap-3 md:grid-cols-4">
               {([
                 ['Minimum refill', 'ads_min_refill_tnd'],
                 ['Maximum refill', 'ads_max_refill_tnd'],
                 ['Minimum daily budget', 'ads_min_daily_budget_tnd'],
                 ['Maximum campaign days', 'ads_max_campaign_days'],
                 ['Daily frequency cap', 'ads_frequency_cap_daily'],
                 ['Click attribution days', 'ads_click_attribution_days'],
                 ['View attribution days', 'ads_view_attribution_days'],
               ] as const).map(([label, key]) => (
                 <label key={key} className="text-xs font-bold text-gray-500">
                   {label}
                   <input type="number" min="1" defaultValue={adsConfig[key]} onBlur={(e) => { const value = Number(e.target.value); if (value !== adsConfig[key]) updateConfig({ [key]: value }); }} className="mt-1 w-full rounded-lg border p-2 text-sm text-gray-900" />
                 </label>
               ))}
             </div>
           </section>
         )}
       </>
     )}
   </div>
 );
}
