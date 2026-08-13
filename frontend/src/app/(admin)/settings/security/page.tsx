
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

export default function SecuritySettingsPage() {
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
        <h2 className="text-lg font-bold text-slate-800 ml-4">Security Settings</h2>
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
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Security Controls"
          description="Configure login lockout thresholds, password strength rules, role-based 2FA enforcement, and custom-domain restrictions."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderNumberInput(formProps, 'security_login_max_attempts', 'Failed Login Attempts', 'attempts', 3, 20)}
          {renderNumberInput(formProps, 'security_login_lockout_minutes', 'Login Lockout Window', 'minutes', 1, 1440)}
          {renderNumberInput(formProps, 'security_password_min_length', 'Minimum Password Length', 'chars', 8, 72)}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'security_password_require_uppercase' as const, label: 'Require Uppercase', description: 'New and reset passwords must include at least one uppercase letter.' },
            { key: 'security_password_require_lowercase' as const, label: 'Require Lowercase', description: 'New and reset passwords must include at least one lowercase letter.' },
            { key: 'security_password_require_number' as const, label: 'Require Number', description: 'New and reset passwords must include at least one numeric digit.' },
            { key: 'security_password_require_symbol' as const, label: 'Require Symbol', description: 'New and reset passwords must include at least one non-alphanumeric symbol.' },
            { key: 'security_custom_domains_enabled' as const, label: 'Custom Domains', description: 'Allow eligible sellers to attach custom storefront domains.' },
          ].map((t: any) => renderToggle(formProps, t))}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 text-xs font-semibold leading-relaxed text-amber-800">
            2FA role enforcement blocks token issuance for matching roles unless the account already has 2FA enabled. Use comma-separated roles: customer, vendor, admin, super_admin.
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderTextInput(formProps, 'security_2fa_required_roles', '2FA Required Roles', 'admin,super_admin')}
          {renderTextInput(formProps, 'security_custom_domain_allowed_suffixes', 'Allowed Domain Suffixes', 'example.com,market.tn')}
          {renderTextInput(formProps, 'security_custom_domain_blocked_suffixes', 'Blocked Domain Suffixes', 'localhost,pandamarket.tn')}
        </div>
      </section>
    </form>
  );
}
