
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

export default function IntegrationsSettingsPage() {
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
        <h2 className="text-lg font-bold text-slate-800 ml-4">Integrations Settings</h2>
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
          icon={<BarChart3 className="h-5 w-5" />}
          title="Analytics and Verification"
          description="Configure public analytics tags and site ownership verification metadata injected into the marketplace shell."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'analytics_ga4_enabled' as const, label: 'Google Analytics 4', description: 'Inject the configured GA4 measurement tag on public pages.' },
            { key: 'analytics_gtm_enabled' as const, label: 'Google Tag Manager', description: 'Inject the configured GTM container script and noscript iframe.' },
            { key: 'analytics_meta_pixel_enabled' as const, label: 'Meta Pixel', description: 'Inject the configured Meta Pixel base code and image fallback.' },
          ].map((t: any) => renderToggle(formProps, t))}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 text-xs font-semibold leading-relaxed text-amber-800">
            Analytics identifiers are public by design. Do not paste API secrets, private tokens, or Cloudflare API tokens here.
          </div>
          {renderTextInput(formProps, 'analytics_ga4_measurement_id', 'GA4 Measurement ID', 'G-XXXXXXXXXX')}
          {renderTextInput(formProps, 'analytics_gtm_container_id', 'GTM Container ID', 'GTM-XXXXXXX')}
          {renderTextInput(formProps, 'analytics_meta_pixel_id', 'Meta Pixel ID', '123456789012345')}
          {renderTextInput(formProps, 'search_console_verification', 'Search Console Verification Token', 'google-site-verification token')}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Globe2 className="h-5 w-5" />}
          title="Cloudflare Metadata"
          description="Store non-secret Cloudflare account and zone identifiers for operational visibility and future custom-hostname automation."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'cloudflare_integration_enabled' as const, label: 'Cloudflare Integration', description: 'Mark Cloudflare as the active CDN/DNS integration for the marketplace.' },
            { key: 'cloudflare_custom_hostnames_enabled' as const, label: 'Custom Hostname Automation', description: 'Allow future custom-domain automation to use Cloudflare SaaS custom hostname metadata.' },
          ].map((t: any) => renderToggle(formProps, t))}
          {renderTextInput(formProps, 'cloudflare_account_id', 'Cloudflare Account ID', 'account identifier')}
          {renderTextInput(formProps, 'cloudflare_zone_id', 'Cloudflare Zone ID', 'zone identifier')}
        </div>
      </section>
    </form>
  );
}
