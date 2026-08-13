
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, AlertTriangle, CheckCircle2, Store, Wallet, ShieldCheck, Globe2, SlidersHorizontal, CreditCard, Crown, Truck, Mail, Shield, BarChart3, MessageSquare, Bell, Construction, UploadCloud, ImageIcon, LayoutGrid, Headphones } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { PlatformSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { renderTextInput, renderNumberInput, renderToggle } from '@/components/admin/settings/SettingsFormHelpers';
import { SectionHeader } from "@/components/admin/SectionHeader";
import { MarketplaceAssetPicker } from "@/components/admin/MarketplaceAssetPicker";
import { HomepageBlocksEditor } from "@/components/admin/HomepageBlocksEditor";
import { HeroCarouselEditor } from "@/components/admin/HeroCarouselEditor";

// Define a permissive schema for now to satisfy Zod
const schema = z.any();

export default function FinanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const form = useForm<PlatformSettings>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    fetch('/api/pd/marketplace/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          form.reset({ ...DEFAULT_SETTINGS, ...data.settings });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [form]);

  const onSubmit = async (data: PlatformSettings) => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetchWithCsrf('/api/pd/marketplace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('success');
      
      // Invalidate cache
      fetch('/api/marketplace/revalidate').catch(console.error);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const formProps = { register: form.register, errors: form.formState.errors, watch: form.watch, setValue: form.setValue };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading form.watch("..</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm sticky top-4 z-10">
        <h2 className="text-lg font-bold text-slate-800 ml-4">Finance Settings</h2>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:opacity-50"
        >
          {saving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

            <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Retention Periods"
          description="Number of days funds are held before becoming available in the vendor wallet."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {renderNumberInput(formProps, 'retention_days_flouci', 'Flouci', 'days', 1, 90)}
          {renderNumberInput(formProps, 'retention_days_konnect', 'Konnect', 'days', 1, 90)}
          {renderNumberInput(formProps, 'retention_days_mandat', 'Mandat Minute', 'days', 1, 90)}
          {renderNumberInput(formProps, 'retention_days_cod', 'COD', 'days', 1, 90)}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Financial Settings"
          description="Manage platform commission, withdrawal threshold, and default currency."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderNumberInput(formProps, 'platform_commission_rate', 'Free Plan Commission Rate', '%', 0, 100, 0.5)}
          {renderNumberInput(formProps, 'min_withdrawal_tnd', 'Minimum Withdrawal Amount', form.watch("default_currency"), 1)}
          {renderTextInput(formProps, 'default_currency', 'Settlement Currency')}
          {renderNumberInput(formProps, 'platform_commission_rate', 'Commission Rate (%)', '%', 0, 100, 0.1)}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<CreditCard className="h-5 w-5" />}
          title="Payment Gateways"
          description="Enable or disable checkout gateways and control platform vs vendor-direct credential usage."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'payment_flouci_enabled' as const, label: 'Flouci', description: 'Allow checkout payments through Flouci.' },
            { key: 'payment_konnect_enabled' as const, label: 'Konnect', description: 'Allow checkout payments through Konnect.' },
            { key: 'payment_paypal_enabled' as const, label: 'PayPal (International)', description: 'Allow global checkout payments via PayPal.' },
            { key: 'payment_mandat_enabled' as const, label: 'Mandat Minute', description: 'Allow manual Mandat Minute payment instructions.' },
            { key: 'payment_cod_enabled' as const, label: 'Cash on Delivery', description: 'Allow COD orders when supported.' },
            { key: 'payment_sandbox_mode' as const, label: 'Sandbox Mode', description: 'Mark payment configuration as test/preproduction mode.' },
            { key: 'payment_vendor_direct_enabled' as const, label: 'Vendor Direct Credentials', description: 'Allow eligible sellers to use their encrypted gateway credentials.' },
          ].map((t: any) => renderToggle(formProps, t))}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Platform Credentials Source</label>
            <select
              value={form.watch("payment_platform_credentials_source")}
              onChange={(e) => form.setValue('payment_platform_credentials_source', e.target.value as PlatformSettings['payment_platform_credentials_source'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="environment">Environment secrets</option>
              <option value="platform_config">Platform config metadata</option>
              <option value="vendor_direct_only">Vendor direct only</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<CreditCard className="h-5 w-5 text-blue-600" />}
          title="PayPal Configuration & Credentials"
          description="Configure platform-wide Sandbox and Live API credentials for PayPal REST API v2."
        />

        {/* Mode & Currency Conversion */}
        <div className="rounded-2xl bg-blue-50/60 p-5 border border-blue-100 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">Active Mode & Currency Conversion</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Active Environment Mode</label>
              <select
                value={form.watch("payment_paypal_mode")}
                onChange={(e) => form.setValue('payment_paypal_mode', e.target.value as 'sandbox' | 'live', {shouldDirty: true})}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
              >
                <option value="sandbox">Sandbox (Testing / Preproduction)</option>
                <option value="live">Live (Production)</option>
              </select>
            </div>
            {renderTextInput(formProps, 'payment_paypal_currency', 'Target PayPal Currency', 'EUR or USD')}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">TND FX Rate (1 TND = X Target)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                value={form.watch("payment_paypal_fx_rate_tnd_to_target")}
                onChange={(e) => form.setValue('payment_paypal_fx_rate_tnd_to_target', Number(e.target.value) || 0.30, {shouldDirty: true})}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
              />
            </div>
          </div>
        </div>

        {/* Sandbox Credentials */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">1. Sandbox (Testing) Credentials</h4>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderTextInput(formProps, 'payment_paypal_sandbox_client_id', 'Sandbox Client ID', 'e.g. AUaFWDFZE...')}
            {renderTextInput(formProps, 'payment_paypal_sandbox_client_secret', 'Sandbox Client Secret', 'e.g. EE2-3eVt...')}
            <div className="md:col-span-2">
              {renderTextInput(formProps, 'payment_paypal_sandbox_webhook_id', 'Sandbox Webhook ID', 'e.g. 8WH12345678... (Assigned when registering Webhook URL in PayPal Dev Dashboard)')}
            </div>
          </div>
        </div>

        {/* Live Credentials */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">2. Live (Production) Credentials</h4>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderTextInput(formProps, 'payment_paypal_live_client_id', 'Live Client ID', 'e.g. BAAAmZT6...')}
            {renderTextInput(formProps, 'payment_paypal_live_client_secret', 'Live Client Secret', 'e.g. EHDOvLKU...')}
            <div className="md:col-span-2">
              {renderTextInput(formProps, 'payment_paypal_live_webhook_id', 'Live Webhook ID', 'e.g. 9KL98765432...')}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">📌 What is Webhook ID and how to get it?</p>
          <p>When you add your platform Webhook URL (<code className="font-mono text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300">https://www.garbage.team/api/pd/payments/webhook/paypal</code>) in the PayPal Developer Dashboard under Apps & Credentials → Webhooks, PayPal generates a <strong>Webhook ID</strong>. Paste it above so PandaMarket can cryptographically verify every inbound payment event.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Mandat Minute Recipient & Proof Email"
          description="Configure the beneficiary details and email address where customers submit Mandat Minute wire receipts."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">{renderTextInput(formProps, 'mandat_recipient_name', 'Recipient Name')}</div>
          {renderTextInput(formProps, 'mandat_recipient_cin', 'Identifiant Number (CIN / MF)')}
          {renderTextInput(formProps, 'mandat_recipient_city', 'City')}
          <div className="md:col-span-2">{renderTextInput(formProps, 'mandat_proof_email', 'Proof of Payment Email Address', 'e.g. billing@pandamarket.tn')}</div>
        </div>
      </section>
    </form>
  );
}
