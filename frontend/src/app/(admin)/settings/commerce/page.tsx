
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, AlertTriangle, CheckCircle2, Store, Wallet, ShieldCheck, Globe2, SlidersHorizontal, CreditCard, Crown, Truck, Mail, Shield, BarChart3, MessageSquare, Bell, Construction, UploadCloud, ImageIcon, LayoutGrid, Headphones , Gift, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { PlatformSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { renderTextInput, renderNumberInput, renderToggle } from '@/components/admin/settings/SettingsFormHelpers';
import { SectionHeader } from "@/components/admin/SectionHeader";
import { MarketplaceAssetPicker } from "@/components/admin/MarketplaceAssetPicker";
import { HomepageBlocksEditor } from "@/components/admin/HomepageBlocksEditor";
import { HeroCarouselEditor } from "@/components/admin/HeroCarouselEditor";

// Define a permissive schema for now to satisfy Zod
const schema = z.any();

export default function CommerceSettingsPage() {
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
        <h2 className="text-lg font-bold text-slate-800 ml-4">Commerce Settings</h2>
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
          icon={<ToggleLeft className="h-5 w-5" />}
          title="Marketplace Availability"
          description="Enable or disable major marketplace features without deploying code."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'marketplace_enabled' as const, label: 'Marketplace Online', description: 'Allow the marketplace to accept normal traffic and interactions.' },
            { key: 'vendor_registration_enabled' as const, label: 'Vendor Registration', description: 'Allow new sellers to register and create stores.' },
            { key: 'buyer_registration_enabled' as const, label: 'Buyer Registration', description: 'Allow shoppers to create customer accounts.' },
            { key: 'cart_enabled' as const, label: 'Shopping Cart', description: 'Allow customers to add products to cart.' },
            { key: 'wishlist_enabled' as const, label: 'Wishlist', description: 'Allow customers to save products for later.' },
            { key: 'shipping_enabled' as const, label: 'Shipping', description: 'Enable shipping workflows and shipping configuration.' },
            { key: 'ai_tools_enabled' as const, label: 'AI Tools', description: 'Enable AI queues, credits, SEO helpers, image compression, and vendor AI provider form.watch("' },
            { key: 'page_builder_enabled' as const, label: 'Page Builder', description: 'Enable vendor Page Builder editing and storefront custom page rendering.' },
            { key: 'plugins_marketplace_enabled' as const, label: 'Plugins Marketplace', description: 'Expose plugin marketplace capabilities when the module is available.' },
            { key: 'email_marketing_enabled' as const, label: 'Email Marketing', description: 'Expose email marketing add-on capabilities when the module is available.' },
          ].map((t: any) => renderToggle(formProps, t))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Gift className="h-5 w-5" />}
          title="Gamified Rewards & Retention Widget"
          description="Configure floating rewards wheel, scratch cards, button label, and wheel prizes for customer conversion."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'rewards_widget_enabled' as const, label: 'Gamified Rewards Widget', description: 'Enable floating rewards wheel and scratch card widget on buyer storefront pages.' },
          ].map((t: any) => renderToggle(formProps, t))}
        </div>
        <SectionHeader
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Content Moderation"
          description="Configure product publication and customer review rules."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'product_moderation_required' as const, label: 'Product Moderation', description: 'Require admin review before unverified seller products go live.' },
            { key: 'product_auto_publish_verified' as const, label: 'Verified Seller Auto-Publish', description: 'Publish verified seller products without manual approval.' },
            {
              key: 'seller_type_change_auto_approval' as const,
              label: form.watch("seller_type_change_auto_approval")
                ? String('sellerTypes.approval.autoApproval')
                : String('sellerTypes.approval.manualApproval'),
              description: form.watch("seller_type_change_auto_approval")
                ? String('sellerTypes.approval.autoApprovalDesc')
                : String('sellerTypes.approval.manualApprovalDesc'),
            },
            { key: 'reviews_enabled' as const, label: 'Customer Reviews', description: 'Allow customers to submit product reviews.' },
            { key: 'review_auto_publish' as const, label: 'Auto-Publish Reviews', description: 'Publish new reviews immediately after submission.' },
          ].map((t: any) => renderToggle(formProps, t))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Store className="h-5 w-5" />}
          title="Order Splitting"
          description="Configure how multi-vendor orders are split and fulfilled."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {renderToggle(formProps, {
            key: 'order_splitting_enabled',
            label: 'Enable Order Splitting',
            description: 'When enabled, multi-vendor carts create separate fulfillments per vendor.',
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<SlidersHorizontal className="h-5 w-5" />}
          title="Tax, Rounding and Unpaid Orders"
          description="Configure platform-wide tax display mode, price rounding, and automatic cleanup for unpaid orders."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Tax Mode</label>
            <select
              value={form.watch("tax_mode")}
              onChange={(e) => form.setValue('tax_mode', e.target.value as PlatformSettings['tax_mode'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="none">No tax display</option>
              <option value="included">Tax included in prices</option>
              <option value="exclusive">Tax added at checkout</option>
            </select>
          </div>
          {renderNumberInput(formProps, 'default_tax_rate', 'Default Tax Rate', '%', 0, 100, 0.1)}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Price Rounding</label>
            <select
              value={form.watch("price_rounding_mode")}
              onChange={(e) => form.setValue('price_rounding_mode', e.target.value as PlatformSettings['price_rounding_mode'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="none">No rounding</option>
              <option value="nearest_0_001">Nearest 0.001</option>
              <option value="nearest_0_010">Nearest 0.010</option>
              <option value="nearest_0_100">Nearest 0.100</option>
            </select>
          </div>
          {renderNumberInput(formProps, 'auto_cancel_unpaid_minutes', 'Auto-Cancel After', 'minutes', 5, 10080)}
          {renderToggle(formProps, {
            key: 'auto_cancel_unpaid_enabled',
            label: 'Auto-Cancel Unpaid Orders',
            description: 'Automatically cancel unpaid orders after the configured delay.',
          })}
        </div>
      </section>
    </form>
  );
}
