
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

export default function ShippingSettingsPage() {
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
        <h2 className="text-lg font-bold text-slate-800 ml-4">Shipping Settings</h2>
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
          icon={<Truck className="h-5 w-5" />}
          title="Shipping Carriers, Zones and Rates"
          description="Configure platform shipping carriers, default origin, city zones, and fallback rates used at checkout."
        />
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'shipping_self_managed_enabled' as const, label: 'Self-Managed Shipping', description: 'Allow vendors to handle their own logistics.' },
            { key: 'shipping_platform_unified_enabled' as const, label: 'Platform Unified Shipping', description: 'Allow platform carrier and fallback rate calculation.' },
            { key: 'shipping_aramex_enabled' as const, label: 'Aramex Carrier', description: 'Include Aramex in platform shipping quotes when credentials are available.' },
            { key: 'shipping_laposte_enabled' as const, label: 'La Poste Carrier', description: 'Include La Poste TN flat-rate estimates.' },
            { key: 'shipping_platform_fallback_enabled' as const, label: 'Platform Fallback Rate', description: 'Return configured flat/zone rates when live carrier rates are unavailable.' },
          ].map((t: any) => renderToggle(formProps, t))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Default Provider</label>
            <select
              value={form.watch("shipping_default_provider")}
              onChange={(e) => form.setValue('shipping_default_provider', e.target.value as PlatformSettings['shipping_default_provider'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="auto">Auto</option>
              <option value="aramex">Aramex</option>
              <option value="laposte">La Poste</option>
              <option value="platform">Platform fallback</option>
            </select>
          </div>
          {renderTextInput(formProps, 'shipping_default_origin_city', 'Default Origin City', 'Tunis')}
          {renderTextInput(formProps, 'shipping_default_origin_country', 'Default Origin Country', 'TN')}
          {renderNumberInput(formProps, 'shipping_platform_flat_rate_tnd', 'Platform Flat Rate', 'TND', 0, 1000, 0.5)}
          {renderNumberInput(formProps, 'shipping_domestic_zone_rate_tnd', 'Domestic Zone Rate', 'TND', 0, 1000, 0.5)}
          {renderNumberInput(formProps, 'shipping_remote_zone_rate_tnd', 'Remote Zone Rate', 'TND', 0, 1000, 0.5)}
          {renderNumberInput(formProps, 'shipping_free_shipping_threshold_tnd', 'Free Shipping Threshold', 'TND', 0, 100000, 1)}
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'shipping_domestic_zone_cities', 'Domestic Zone Cities', 'Tunis,Ariana,Ben Arous,Manouba')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'shipping_remote_zone_cities', 'Remote Zone Cities', 'Tozeur,Tataouine,Kebili')}
          </div>
        </div>
      </section>
    </form>
  );
}
