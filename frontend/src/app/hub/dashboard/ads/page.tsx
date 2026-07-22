'use client';

import { fetchWithCsrf } from '@/lib/api';
import { BarChart3, Building, CheckCircle2, CreditCard, Image as ImageIcon, Loader2, Megaphone, Plus, Upload, WalletCards, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../../../../contexts/LocaleContext';
import { AdsCampaignWizard } from '../../../../components/dashboard/AdsCampaignWizard';
import { AdsPerformanceCharts } from '../../../../components/dashboard/AdsPerformanceCharts';

type Account = { balance:string; reserved_balance:string; currency:string; total_spend:string; active_campaigns:number; auto_refill_enabled?:boolean; auto_refill_threshold?:string; auto_refill_amount?:string };
type Campaign = { id:string; name:string; campaign_type:string; status:string; daily_budget:string; total_budget:string; spent_amount:string; created_at:string };
type Placement = { id:string; name:string; placement_key:string; format:string; default_price:string };
type Transaction = { id:string; type:string; amount:string; balance_after:string; description?:string; created_at:string };
type Refill = { id:string; gateway:string; amount:string; currency:string; status:string; gateway_reference?:string; proof_url?:string; rejection_reason?:string; created_at:string; captured_at?:string };
type Analytics = { impressions:string; clicks:string; conversions:string; spend:string; revenue:string; ctr:number; average_cpc:number; conversion_rate:number; roas:number };
type DailyStat = { stat_date:string; impressions:string; clicks:string; conversions:string; spend:string; revenue:string };
type BillingInfo = { recipient_name:string; cin:string; city:string; bank_name:string; rib:string; iban:string; phone:string };

const money = (value?: string, currency = 'TND') => `${Number(value || 0).toFixed(3)} ${currency}`;

export default function AdsDashboardPage() {
  const { t, dir } = useLocale();
  const [account, setAccount] = useState<Account | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refills, setRefills] = useState<Refill[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('');
  const [from, setFrom] = useState(() => new Date(Date.now()-30*86400000).toISOString().slice(0,10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [refillAmount, setRefillAmount] = useState('20');
  const [refillGateway, setRefillGateway] = useState('flouci');
  const [refillProofUrl, setRefillProofUrl] = useState('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [autoRefillEnabled, setAutoRefillEnabled] = useState(false);
  const [autoRefillThreshold, setAutoRefillThreshold] = useState('5.000');
  const [autoRefillAmount, setAutoRefillAmount] = useState('20.000');
  const [savingAutoRefill, setSavingAutoRefill] = useState(false);

  const emptyCampaignForm={name:'',campaign_type:'sponsored_product',objective:'traffic',pricing_model:'cpc',daily_budget:'5',total_budget:'50',bid_amount:'0.100',creative_title:'',creative_description:'',image_url:'',cta_label:'Shop now',destination_url:'',product_id:'',starts_at:'',ends_at:'',locale:'all',category:'',device:'all',placement_ids:[] as string[]};
  const [form, setForm] = useState(emptyCampaignForm);

  const load = async () => {
    setLoading(true);
    try {
      const [a,c,p,t,n,r] = await Promise.all([
        fetchWithCsrf('/api/pd/ads/account', { credentials:'include' }),
        fetchWithCsrf('/api/pd/ads/campaigns', { credentials:'include' }),
        fetchWithCsrf('/api/pd/ads/placements', { credentials:'include' }),
        fetchWithCsrf('/api/pd/ads/transactions?limit=50', { credentials:'include' }),
        fetchWithCsrf(`/api/pd/ads/analytics?from=${from}&to=${to}${campaignFilter?`&campaign_id=${encodeURIComponent(campaignFilter)}`:''}`, { credentials:'include' }),
        fetchWithCsrf('/api/pd/ads/refills', { credentials:'include' }),
      ]);
      if (!a.ok || !c.ok || !p.ok || !t.ok || !n.ok || !r.ok) throw new Error('Unable to load Ads data');
      const [ad,cd,pd,td,nd,rd] = await Promise.all([a.json(),c.json(),p.json(),t.json(),n.json(),r.json()]);
      setAccount(ad.account);
      if (ad.billing_info) setBillingInfo(ad.billing_info);
      setCampaigns(cd.campaigns || []);
      setPlacements(pd.placements || []);
      setTransactions(td.transactions || []);
      setAnalytics(nd.summary || null);
      setDaily(nd.daily || []);
      setRefills(rd.refills || []);
      if(ad.account){
        setAutoRefillEnabled(Boolean(ad.account.auto_refill_enabled));
        if(ad.account.auto_refill_threshold) setAutoRefillThreshold(String(ad.account.auto_refill_threshold));
        if(ad.account.auto_refill_amount) setAutoRefillAmount(String(ad.account.auto_refill_amount));
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load Ads data'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product_id') || '';
    if (productId) { setForm((v) => ({ ...v, product_id:productId, campaign_type:'sponsored_product' })); setCreating(true); }
    const refillId=params.get('refill'); if(refillId&&!params.get('status')) fetchWithCsrf(`/api/pd/ads/refills/${encodeURIComponent(refillId)}/verify`,{method:'POST',credentials:'include'}).then(()=>load()).catch(()=>undefined);
    void load();
  }, []);

  const redeemCoupon=async()=>{const code=window.prompt('Enter your PandaMarket Ads coupon code:')?.trim();if(!code)return;const response=await fetchWithCsrf('/api/pd/ads/coupons/redeem',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const data=await response.json();if(!response.ok){setError(data.error?.message||'Coupon redemption failed');return;}await load();};

  const saveAutoRefill = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccessMsg(''); setSavingAutoRefill(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ads/account/auto-refill', { method:'POST', credentials:'include', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ enabled:autoRefillEnabled, threshold:Number(autoRefillThreshold), amount:Number(autoRefillAmount) }) });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error?.message || 'Failed to save auto-refill settings');
      setSuccessMsg(t('ads.autoRefillSaved') || 'Auto-refill settings saved successfully');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save auto-refill settings'); }
    finally { setSavingAutoRefill(false); }
  };

  const uploadProofPicture = async (file: File) => {
    setError(''); setUploadingFile(true);
    try {
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type, file_size: file.size, purpose: 'mandat_proof' }),
      });
      if (!presignRes.ok) {
        const errData = await presignRes.json();
        throw new Error(errData.error?.message || 'Failed to prepare picture upload');
      }
      const presignData = await presignRes.json();
      const { upload_url, file_key, public_url } = presignData;
      if (upload_url) {
        const uploadRes = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!uploadRes.ok) throw new Error('Picture upload to server failed');
      }
      const finalUrl = public_url || file_key || upload_url;
      setRefillProofUrl(finalUrl);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setProofPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setProofPreviewUrl(finalUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Picture upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const startRefill=async(event:React.FormEvent)=>{
    event.preventDefault(); setError(''); setSuccessMsg('');
    if(refillGateway==='manual_mandat'){
      if(!refillProofUrl.trim()){setError(t('ads.proofUrlHint') || 'Please upload a picture of your payment receipt.');return;}
      const r=await fetchWithCsrf('/api/pd/ads/refills/manual-mandat',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:Number(refillAmount),proof_url:refillProofUrl.trim()})});
      const d=await r.json();if(!r.ok){setError(d.error?.message||'Unable to submit manual refill');return;}
      setRefilling(false);setRefillProofUrl('');setProofPreviewUrl('');setSuccessMsg(t('ads.mandatSubmitted'));await load();return;
    }
    const r=await fetchWithCsrf('/api/pd/ads/refills',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:Number(refillAmount),gateway:refillGateway})});const d=await r.json();if(!r.ok){setError(d.error?.message||'Unable to start refill');return;}window.location.href=d.checkout_url;
  };

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const res = await fetchWithCsrf('/api/pd/ads/campaigns', { method:'POST', credentials:'include', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({
      name:form.name,campaign_type:form.campaign_type,objective:form.objective,pricing_model:form.pricing_model,bid_amount:Number(form.bid_amount),daily_budget:Number(form.daily_budget),total_budget:Number(form.total_budget),placement_ids:form.placement_ids,
      starts_at:form.starts_at?new Date(form.starts_at).toISOString():undefined,ends_at:form.ends_at?new Date(form.ends_at).toISOString():undefined,
      targeting:{locale:form.locale,category:form.category||undefined,device:form.device},
      creative:{title:form.creative_title,description:form.creative_description||undefined,image_url:form.image_url||undefined,product_id:form.product_id||undefined,cta_label:form.cta_label||undefined,destination_url:form.destination_url||undefined},
    }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error?.message || 'Unable to create campaign'); return; }
    setCreating(false);setForm(emptyCampaignForm);await load();
  };

  const action = async (id:string, name:string) => {
    const res = await fetchWithCsrf(`/api/pd/ads/campaigns/${id}/${name}`, { method:'POST', credentials:'include' });
    const data = await res.json();
    if (!res.ok) { setError(data.error?.message || 'Campaign action failed'); return; }
    await load();
  };

  if (loading) return <div className="p-8 text-sm font-semibold text-slate-500">{t('ads.loadingAds')}</div>;
  return (
    <div dir={dir} className="space-y-7 p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">PandaMarket Ads</p><h1 className="mt-1 text-3xl font-black text-slate-950">{t('ads.center')}</h1><p className="mt-2 text-sm text-slate-500">{t('ads.sponsorDesc')}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={redeemCoupon} className="rounded-xl border border-amber-500 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800">{t('ads.redeemCoupon')}</button><button onClick={() => setRefilling(true)} className="rounded-xl border border-emerald-600 bg-white px-5 py-3 text-sm font-black text-emerald-700">{t('ads.refillAccount')}</button><button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20"><Plus className="h-4 w-4" /> {t('ads.newCampaign')}</button></div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {successMsg && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{successMsg}</div>}
      <div className="grid gap-4 md:grid-cols-4">
        {[[t('ads.availableBalance'),money(account?.balance,account?.currency),WalletCards],[t('ads.reserved'),money(account?.reserved_balance,account?.currency),WalletCards],[t('ads.totalSpend'),money(account?.total_spend,account?.currency),BarChart3],[t('ads.activeCampaigns'),String(account?.active_campaigns || 0),Megaphone]].map(([label,value,Icon]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-xs font-bold uppercase text-slate-400">{String(label)}</p><p className="mt-1 text-2xl font-black text-slate-900">{String(value)}</p></div>)}
      </div>
      <div className={`rounded-2xl border p-5 ${Number(account?.balance||0)<5?'border-red-200 bg-red-50':'border-amber-200 bg-amber-50'}`}><p className={`font-black ${Number(account?.balance||0)<5?'text-red-900':'text-amber-900'}`}>{Number(account?.balance||0)<5?t('ads.lowBalanceTitle'):t('ads.prepaidAccountTitle')}</p><p className={`mt-1 text-sm ${Number(account?.balance||0)<5?'text-red-700':'text-amber-800'}`}>{Number(account?.balance||0)<5?t('ads.lowBalanceDesc'):t('ads.prepaidAccountDesc')}</p></div>
      
      {/* Auto-Refill Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={saveAutoRefill} className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-black text-slate-900">{t('ads.autoRefillTitle')}</h2><p className="text-xs text-slate-500">{t('ads.autoRefillDesc')}</p></div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer"><input type="checkbox" checked={autoRefillEnabled} onChange={e=>setAutoRefillEnabled(e.target.checked)} className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"/> {t('ads.enableAutoRefill')}</label>
            {autoRefillEnabled && (
              <>
                <label className="text-xs font-bold text-slate-500">{t('ads.minThreshold')}<input type="number" min="0" step="1" value={autoRefillThreshold} onChange={e=>setAutoRefillThreshold(e.target.value)} className="ml-2 rounded-lg border px-3 py-1.5 text-sm font-bold w-24"/></label>
                <label className="text-xs font-bold text-slate-500">{t('ads.refillAmountLabel')}<input type="number" min="1" step="1" value={autoRefillAmount} onChange={e=>setAutoRefillAmount(e.target.value)} className="ml-2 rounded-lg border px-3 py-1.5 text-sm font-bold w-24"/></label>
              </>
            )}
            <button disabled={savingAutoRefill} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{savingAutoRefill ? '...' : t('ads.saveSettings')}</button>
          </div>
        </form>
      </section>

      {/* Performance Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-black">{t('ads.performanceTitle')}</h2><p className="text-xs text-slate-500">{t('ads.performanceDesc')}</p></div><div className="flex flex-wrap gap-2"><select aria-label="Campaign filter" value={campaignFilter} onChange={e=>setCampaignFilter(e.target.value)} className="max-w-48 rounded-lg border px-3 py-2 text-sm"><option value="">{t('ads.allCampaigns')}</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input aria-label="From date" type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"/><input aria-label="To date" type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"/><button onClick={()=>load()} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white">{t('ads.apply')}</button></div></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">{[[t('ads.impressions'),analytics?.impressions||0],[t('ads.clicks'),analytics?.clicks||0],[t('ads.ctr'),`${((analytics?.ctr||0)*100).toFixed(2)}%`],[t('ads.avgCpc'),money(String(analytics?.average_cpc||0))],[t('ads.conversions'),analytics?.conversions||0],[t('ads.convRate'),`${((analytics?.conversion_rate||0)*100).toFixed(2)}%`],[t('ads.revenue'),money(analytics?.revenue)],[t('ads.roas'),`${Number(analytics?.roas||0).toFixed(2)}×`]].map(([l,v])=><div key={String(l)} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">{String(l)}</p><p className="mt-1 font-black text-slate-900">{String(v)}</p></div>)}</div><AdsPerformanceCharts daily={daily}/></section>
      
      {/* Campaigns Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-black text-slate-900">{t('ads.campaignsTitle')}</h2></div>{campaigns.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">{t('ads.noCampaigns')}</div> : <div className="divide-y divide-slate-100">{campaigns.map((c) => <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-black text-slate-900">{c.name}</p><p className="text-xs font-semibold text-slate-500">{c.campaign_type.replaceAll('_',' ')} · {money(c.spent_amount)} {t('ads.spentOf')} {money(c.total_budget)}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{c.status.replaceAll('_',' ')}</span>{c.status === 'draft' && <button onClick={() => action(c.id,'submit')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">{t('ads.submit')}</button>}{c.status === 'approved' && <button onClick={() => action(c.id,'launch')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">{t('ads.launch')}</button>}{c.status === 'active' && <button onClick={() => action(c.id,'pause')} className="rounded-lg border px-3 py-2 text-xs font-black">{t('ads.pause')}</button>}{c.status === 'paused' && <button onClick={() => action(c.id,'resume')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">{t('ads.resume')}</button>}</div></div>)}</div>}</section>

      {/* Refill History */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-black">{t('ads.refillHistoryTitle')}</h2><p className="text-xs text-slate-500">{t('ads.refillHistoryDesc')}</p></div>{refills.length===0?<p className="p-8 text-center text-sm text-slate-400">{t('ads.noRefills')}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{t('ads.date')}</th><th className="p-4">{t('ads.gateway')}</th><th className="p-4">{t('ads.amount')}</th><th className="p-4">{t('ads.status')}</th><th className="p-4">{t('ads.proof')}</th><th className="p-4">{t('ads.receipt')}</th></tr></thead><tbody className="divide-y">{refills.map(r=><tr key={r.id}><td className="p-4 text-slate-500">{new Date(r.created_at).toLocaleString()}</td><td className="p-4 font-bold capitalize">{r.gateway==='manual_mandat'?t('ads.mandatGateway'):r.gateway}</td><td className="p-4 font-black">{money(r.amount,r.currency)}</td><td className="p-4">{r.status==='captured'?<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{t('ads.captured')}</span>:r.status==='pending_review'?<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{t('ads.pendingReview')}</span>:r.status==='rejected'?<span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">{t('ads.rejected')}</span>:<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{r.status.replaceAll('_',' ')}</span>}{r.status==='rejected'&&r.rejection_reason&&<p className="mt-1 text-[11px] text-red-500">{r.rejection_reason}</p>}</td><td className="p-4">{r.proof_url?<a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 underline">{t('ads.viewProof')}</a>:<span className="text-xs text-slate-400">—</span>}</td><td className="p-4">{r.status==='captured'?<a href={`/api/pd/ads/refills/${encodeURIComponent(r.id)}/receipt`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{t('ads.download')}</a>:<span className="text-xs text-slate-400">{t('ads.unavailable')}</span>}</td></tr>)}</tbody></table></div>}</section>

      {/* Transactions Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-black">{t('ads.transactionsTitle')}</h2></div>{transactions.length===0?<p className="p-8 text-center text-sm text-slate-400">{t('ads.noTransactions')}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{t('ads.date')}</th><th className="p-4">{t('ads.type')}</th><th className="p-4">{t('ads.description')}</th><th className="p-4">{t('ads.amount')}</th><th className="p-4">{t('ads.balance')}</th></tr></thead><tbody className="divide-y">{transactions.map(t=><tr key={t.id}><td className="p-4 text-slate-500">{new Date(t.created_at).toLocaleString()}</td><td className="p-4 font-bold">{t.type.replaceAll('_',' ')}</td><td className="p-4 text-slate-500">{t.description||'—'}</td><td className={`p-4 font-black ${Number(t.amount)>=0?'text-emerald-600':'text-red-600'}`}>{Number(t.amount)>=0?'+':''}{money(t.amount)}</td><td className="p-4 font-bold">{money(t.balance_after)}</td></tr>)}</tbody></table></div>}</section>
      
      {/* Refill Modal with Picture Upload and Billing Information */}
      {refilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form onSubmit={startRefill} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{t('ads.refillModalTitle')}</h2>
                <p className="text-xs text-slate-500">{t('ads.refillModalDesc')}</p>
              </div>
              <button type="button" onClick={() => setRefilling(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              {t('ads.amountTnd')}
              <input type="number" min="0.001" step="0.001" value={refillAmount} onChange={e => setRefillAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-lg font-black text-slate-900 focus:border-emerald-500 focus:ring-emerald-500" />
            </label>

            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              {t('ads.gateway')}
              <select value={refillGateway} onChange={e => setRefillGateway(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-900 normal-case focus:border-emerald-500 focus:ring-emerald-500">
                <option value="flouci">Flouci</option>
                <option value="konnect">Konnect</option>
                <option value="manual_mandat">{t('ads.mandatGateway')}</option>
              </select>
            </label>

            {/* Billing Details & Picture Upload for Bank Transfer / Mandat */}
            {refillGateway === 'manual_mandat' && (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-amber-700" />
                  <h3 className="font-black text-amber-900 text-sm">{t('ads.billingDetailsTitle')}</h3>
                </div>

                <div className="space-y-1.5 text-xs text-slate-800 font-semibold bg-white p-3 rounded-xl border border-amber-100">
                  <p><span className="font-bold text-slate-500">{t('ads.recipientName')}:</span> {billingInfo?.recipient_name || 'PandaMarket SARL'}</p>
                  <p><span className="font-bold text-slate-500">{t('ads.bankName')}:</span> {billingInfo?.bank_name || 'STB (Société Tunisienne de Banque)'}</p>
                  <p className="font-mono text-slate-900"><span className="font-bold text-slate-500 font-sans">{t('ads.rib')}:</span> {billingInfo?.rib || '10 000 0000000000000 00'}</p>
                  <p className="font-mono text-slate-900"><span className="font-bold text-slate-500 font-sans">{t('ads.iban')}:</span> {billingInfo?.iban || 'TN59 1000 0000 0000 0000 0000'}</p>
                  <p><span className="font-bold text-slate-500">{t('ads.cinNumber')}:</span> {billingInfo?.cin || '01234567'} ({billingInfo?.city || 'Tunis'})</p>
                  {billingInfo?.phone && <p><span className="font-bold text-slate-500">{t('ads.phone')}:</span> {billingInfo.phone}</p>}
                </div>

                <p className="text-[11px] font-medium text-amber-800">{t('ads.transferInstructions')}</p>

                {/* Picture Upload Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-slate-700">{t('ads.proofImage')}</label>
                  
                  {uploadingFile ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-white p-4 text-xs font-bold text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      {t('ads.uploadingProof')}
                    </div>
                  ) : proofPreviewUrl ? (
                    <div className="relative overflow-hidden rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                      <div className="flex items-center gap-3">
                        {proofPreviewUrl.startsWith('data:image') || proofPreviewUrl.startsWith('http') ? (
                          <img src={proofPreviewUrl} alt="Receipt preview" className="h-14 w-14 rounded-lg object-cover border border-emerald-200" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs">PDF</div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Uploaded successfully
                          </div>
                          <button type="button" onClick={() => { setRefillProofUrl(''); setProofPreviewUrl(''); }} className="mt-1 text-[11px] font-bold text-red-600 underline">Change picture</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-white p-4 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50">
                      <Upload className="h-6 w-6 text-amber-600" />
                      <span className="mt-2 text-xs font-black text-slate-900">{t('ads.uploadProofBtn') || 'Click to select picture'}</span>
                      <span className="mt-0.5 text-[10px] text-slate-400">PNG, JPG, WEBP, or PDF up to 10MB</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadProofPicture(e.target.files[0]); }} />
                    </label>
                  )}
                </div>
              </div>
            )}

            <button disabled={uploadingFile} className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-lg shadow-emerald-600/20">
              {refillGateway === 'manual_mandat' ? t('ads.submitMandat') : t('ads.continueToPayment')}
            </button>
          </form>
        </div>
      )}

      {creating && <AdsCampaignWizard placements={placements} productId={form.product_id} onClose={()=>setCreating(false)} onCreated={load} onError={setError}/>} 
    </div>
  );
}
