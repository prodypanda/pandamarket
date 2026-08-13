
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, AlertTriangle, CheckCircle2, Store, Wallet, ShieldCheck, Globe2, SlidersHorizontal, CreditCard, Crown, Truck, Mail, Shield, BarChart3, MessageSquare, Bell, Construction, UploadCloud, ImageIcon, LayoutGrid, Headphones } from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { PlatformSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { renderTextInput, renderNumberInput, renderToggle } from '@/components/admin/settings/SettingsFormHelpers';
import { SectionHeader } from "@/components/admin/SectionHeader";
import { MarketplaceAssetPicker } from "@/components/admin/MarketplaceAssetPicker";
import { HomepageBlocksEditor } from "@/components/admin/HomepageBlocksEditor";
import { HeroCarouselEditor } from "@/components/admin/HeroCarouselEditor";

// Define a permissive schema for now to satisfy Zod
const schema = z.any();

export default function MarketplaceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marketplaceLogoPickerTarget, setMarketplaceLogoPickerTarget] = useState<string | null>(null);
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
        <h2 className="text-lg font-bold text-slate-800 ml-4">Marketplace Settings</h2>
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
          icon={<Store className="h-5 w-5" />}
          title="Marketplace Identity"
          description="Control the public marketplace identity and customer support contact details."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderTextInput(formProps, 'marketplace_name', 'Marketplace Name')}
          {renderTextInput(formProps, 'marketplace_support_email', 'Support Email', 'support@pandamarket.tn')}
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'marketplace_tagline', 'Marketplace Tagline')}
          </div>
          {renderTextInput(formProps, 'marketplace_support_phone', 'Support Phone')}
          {renderTextInput(formProps, 'marketplace_support_whatsapp', 'Support WhatsApp', '+216 ...')}
          {renderTextInput(formProps, 'marketplace_address', 'Business Address')}
          {renderTextInput(formProps, 'marketplace_city', 'City')}
          {renderTextInput(formProps, 'marketplace_country', 'Country')}
          {renderTextInput(formProps, 'marketplace_business_hours', 'Business Hours', 'Mon–Fri 09:00–18:00')}
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'marketplace_public_url', 'Public Marketplace URL', 'https://pandamarket.tn')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'marketplace_og_image_url', 'Social Sharing Image URL', '/og-image.png')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'marketplace_favicon_url', 'Favicon URL', '/favicon.ico')}
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Marketplace Logos</label>
            <p className="text-xs font-medium text-slate-500 ml-1">Use a dark logo on light surfaces and a light logo on dark surfaces. The main logo remains the fallback.</p>
            <div className="grid gap-4 rounded-[1.5rem] border border-slate-200/70 bg-stone-50 p-5 shadow-sm lg:grid-cols-3">
              {[
                { key: 'marketplace_logo_url' as const, label: 'Main Logo', value: form.watch("marketplace_logo_url"), previewClass: 'bg-white' },
                { key: 'marketplace_logo_dark_url' as const, label: 'Dark Logo', value: form.watch("marketplace_logo_dark_url"), previewClass: 'bg-white' },
                { key: 'marketplace_logo_light_url' as const, label: 'Light Logo', value: form.watch("marketplace_logo_light_url"), previewClass: 'bg-slate-950' },
              ].map((logo) => (
                <div key={logo.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className={`flex h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 ${logo.previewClass}`}>
                    {logo.value ? (
                      <div
                        aria-label={`${form.watch("marketplace_name")} ${logo.label}`}
                        role="img"
                        className="h-full w-full bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${getResizedImageUrl(logo.value)})` }}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">{logo.label}</p>
                  <p className="text-xs font-medium text-slate-500">{logo.value ? 'Logo configured' : 'No logo selected'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {logo.value && (
                      <button
                        type="button"
                        onClick={() => form.setValue(logo.key as any, '', {shouldDirty: true})}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMarketplaceLogoPickerTarget(logo.key)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-3 py-2 text-xs font-bold text-white hover:bg-[#991B1B]"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Choose
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {renderTextInput(formProps, 'marketplace_primary_color', 'Primary Color')}
          {renderTextInput(formProps, 'marketplace_secondary_color', 'Secondary Color')}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Default Locale</label>
            <select
              value={form.watch("marketplace_default_locale")}
              onChange={(e) => form.setValue('marketplace_default_locale', e.target.value as PlatformSettings['marketplace_default_locale'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="fr">French</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          {renderTextInput(formProps, 'marketplace_supported_locales', 'Supported Locales', 'fr,en,ar')}
          {renderToggle(formProps, {
            key: 'marketplace_rtl_enabled',
            label: 'Enable RTL',
            description: 'Allow right-to-left rendering for supported languages such as Arabic.',
          })}
          <div className="md:col-span-2 space-y-1.5 mt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Marketplace Theme</label>
            {/* renderMarketplaceThemeSelector() */}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Store className="h-5 w-5" />}
          title="Marketplace Social Links"
          description="Show official marketplace social profiles in the public Hub footer."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderTextInput(formProps, 'marketplace_facebook_url', 'Facebook URL', 'https://facebook.com/...')}
          {renderTextInput(formProps, 'marketplace_instagram_url', 'Instagram URL', 'https://instagram.com/...')}
          {renderTextInput(formProps, 'marketplace_x_url', 'X URL', 'https://x.com/...')}
          {renderTextInput(formProps, 'marketplace_tiktok_url', 'TikTok URL', 'https://tiktok.com/@...')}
          {renderTextInput(formProps, 'marketplace_youtube_url', 'YouTube URL', 'https://youtube.com/@...')}
          {renderTextInput(formProps, 'marketplace_linkedin_url', 'LinkedIn URL', 'https://linkedin.com/company/...')}
          {renderTextInput(formProps, 'marketplace_whatsapp_url', 'WhatsApp URL', 'https://wa.me/...')}
          {renderTextInput(formProps, 'marketplace_telegram_url', 'Telegram URL', 'https://t.me/...')}
          {renderTextInput(formProps, 'marketplace_pinterest_url', 'Pinterest URL', 'https://pinterest.com/...')}
          {renderTextInput(formProps, 'marketplace_snapchat_url', 'Snapchat URL', 'https://snapchat.com/add/...')}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<Headphones className="h-5 w-5" />}
          title="Marketplace Support Links"
          description="Control the Help, Terms, Privacy, and Contact links shown in the public Hub footer."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderTextInput(formProps, 'marketplace_help_url', 'Help URL', '/hub/search')}
          {renderTextInput(formProps, 'marketplace_terms_url', 'Terms URL', '/hub/search')}
          {renderTextInput(formProps, 'marketplace_privacy_url', 'Privacy URL', '/hub/search')}
          {renderTextInput(formProps, 'marketplace_refund_url', 'Refund Policy URL', '/hub/search')}
          {renderTextInput(formProps, 'marketplace_cookie_policy_url', 'Cookie Policy URL', '/hub/search')}
          {renderTextInput(formProps, 'marketplace_contact_url', 'Contact URL', '/hub/search')}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<ImageIcon className="h-5 w-5" />}
          title="Hub Homepage and Catalog"
          description="Configure homepage layout, hero banner copy, featured category order, and the default product sort."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Homepage Layout</label>
            <select
              value={form.watch("hub_homepage_layout")}
              onChange={(e) => form.setValue('hub_homepage_layout', e.target.value as PlatformSettings['hub_homepage_layout'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="theme_default">Theme default</option>
              <option value="classic">Classic marketplace</option>
              <option value="deals">Deals marketplace</option>
              <option value="premium_deals">Premium deals</option>
              <option value="alibaba">Alibaba B2B</option>
              <option value="amazon">Amazon classic</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Homepage Product Grid Loading Style</label>
            <select
              value={form.watch("hub_homepage_pagination_style") || 'none'}
              onChange={(e) => form.setValue('hub_homepage_pagination_style', e.target.value as PlatformSettings['hub_homepage_pagination_style'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="none">None (Show exactly 12 items only)</option>
              <option value="infinite">Infinite Scroll (Auto load on scroll)</option>
              <option value="load_more">Load More Button</option>
              <option value="pagination">Classic Pagination (1, 2, 3...)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Categories Megamenu Version</label>
            <select
              value={form.watch("hub_megamenu_style") || 'standard'}
              onChange={(e) => form.setValue('hub_megamenu_style', e.target.value as PlatformSettings['hub_megamenu_style'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="standard">Version 1: Standard List (Alibaba Compact)</option>
              <option value="visual_rich">Version 2: Visual Cards (Compact Pictures & Descriptions)</option>
              <option value="ultra_rich">Version 3: Ultra-Rich Showcase (Large Pictures & Hero Banners)</option>
              <option value="ultra_rich_deep">Version 4: Ultra-Rich Deep Showcase (Large Pictures & Interactive Submenus)</option>
            </select>
          </div>
          {renderToggle(formProps, {
            key: 'hub_megamenu_lazy_loading',
            label: 'Megamenu Lazy Loading',
            description:
              'When enabled, category trees are lazy-loaded on demand when hovering or clicking the Megamenu, improving initial page load speed.',
          })}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Category / Subcategory Page Style Version</label>
            <select
              value={form.watch("hub_category_page_style") || 'v1_classic'}
              onChange={(e) => form.setValue('hub_category_page_style', e.target.value as PlatformSettings['hub_category_page_style'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="v1_classic">Version 1: Classic Header & Grid</option>
              <option value="v2_modern_showcase">Version 2: Modern Showcase (Bigger Picture Hero & Compact Info Area)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Default Product Sort</label>
            <select
              value={form.watch("catalog_default_sort")}
              onChange={(e) => form.setValue('catalog_default_sort', e.target.value as PlatformSettings['catalog_default_sort'], {shouldDirty: true})}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="title_asc">Title A-Z</option>
            </select>
          </div>
          {renderTextInput(formProps, 'hub_homepage_banner_title', 'Banner Title', 'Your marketplace headline')}
          {renderTextInput(formProps, 'hub_homepage_banner_subtitle', 'Banner Subtitle', 'Short hero description')}
          {renderTextInput(formProps, 'hub_homepage_banner_cta_label', 'Banner CTA Label', 'Explorer le Hub')}
          {renderTextInput(formProps, 'hub_homepage_banner_cta_url', 'Banner CTA URL', '/hub/search')}
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'hub_homepage_banner_image_url', 'Banner Image URL', '/pd-product-images/...')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput(formProps, 'catalog_featured_category_slugs', 'Featured Category Slugs', 'electronics,beauty,home')}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<SlidersHorizontal className="h-5 w-5" />}
          title="Homepage Blocks"
          description="Enable, reorder, and customize blocks, banners, CTAs, and hero slides for Alibaba, Amazon, AliExpress, and Classic homepages."
        />
        <HomepageBlocksEditor
          value={form.watch("hub_homepage_blocks")}
          onChange={(next) => form.setValue('hub_homepage_blocks', next, {shouldDirty: true})}
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<LayoutGrid className="h-5 w-5" />}
          title="Alibaba B2B Hero Section (Categories, Carousel & Seller Rail)"
          description="Configure the Hero area of the Alibaba B2B homepage — toggle category sidebar, carousel, and seller rail visibility; customize max categories, seller rail text, and custom carousel slides."
        />
        <div className="space-y-6">
          {/* Visibility Toggles */}
          <div>
            <h4 className="mb-3 text-sm font-black text-slate-700">Hero Column Visibility</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { key: 'hub_hero_show_category_sidebar' as const, label: 'Category Sidebar', description: 'Show the vertical category department sidebar on the left.' },
                { key: 'hub_hero_show_carousel' as const, label: 'Hero Carousel', description: 'Show the main hero carousel/banner in the center.' },
                { key: 'hub_hero_show_seller_rail' as const, label: 'Seller Rail', description: 'Show the seller/supplier rail on the right.' },
              ].map((t: any) => renderToggle(formProps, t))}
            </div>
          </div>

          {/* Category Sidebar Settings */}
          {form.watch("hub_hero_show_category_sidebar") && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <h4 className="mb-3 text-sm font-black text-slate-800 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-[#ff6a00]" /> Category Sidebar Settings
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Max Categories Displayed</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.watch("hub_hero_category_sidebar_max_items")}
                    onChange={(e) => form.setValue('hub_hero_category_sidebar_max_items', Math.max(1, Math.min(30, Number(e.target.value) || 14)), {shouldDirty: true})}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Controls how many top-level categories appear in the vertical department menu (1 to 30).</p>
                </div>
              </div>
            </div>
          )}

          {/* Seller Rail Settings */}
          {form.watch("hub_hero_show_seller_rail") && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <h4 className="mb-3 text-sm font-black text-slate-800 flex items-center gap-2">
                <Store className="h-4 w-4 text-[#ff6a00]" /> Seller Rail Configuration
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {renderTextInput(formProps, 'hub_hero_seller_rail_title', 'Rail Card Title', 'Accès Vendeurs & Fournisseurs')}
                {renderTextInput(formProps, 'hub_hero_seller_rail_subtitle', 'Rail Subtitle', 'Ouvrez votre boutique B2B...')}
                {renderTextInput(formProps, 'hub_hero_seller_rail_cta_label', 'CTA Button Label', 'Espace Vendeur')}
                {renderTextInput(formProps, 'hub_hero_seller_rail_cta_url', 'CTA Button URL', '/hub/dashboard')}
                {renderTextInput(formProps, 'hub_hero_seller_rail_badge_text', 'Badge Text', 'PandaMarket B2B')}
              </div>
            </div>
          )}

          {/* Carousel Slides Configuration */}
          {form.watch("hub_hero_show_carousel") && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-4">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#ff6a00]" /> Hero Carousel Configuration
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4 border-b border-slate-200/80 pb-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Slide Source Mode</label>
                  <select
                    value={form.watch("hub_hero_carousel_source_mode")}
                    onChange={(e) => form.setValue('hub_hero_carousel_source_mode', e.target.value, {shouldDirty: true})}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  >
                    <option value="hybrid">🔀 Hybrid (Custom Slides + Categories)</option>
                    <option value="custom_only">🎯 Custom Carousel Slides Only</option>
                    <option value="auto_categories_only">🏷️ Auto Category Banners Only</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Auto Category Slides Count</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.watch("hub_hero_carousel_max_categories")}
                    onChange={(e) => form.setValue('hub_hero_carousel_max_categories', Math.max(1, Math.min(10, Number(e.target.value) || 5)), {shouldDirty: true})}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Number of top categories to auto-generate banners for (1 to 10).</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Slide Rotation Delay (ms)</label>
                  <select
                    value={form.watch("hub_hero_carousel_interval")}
                    onChange={(e) => form.setValue("hub_hero_carousel_interval" as any, Number(e.target.value), {shouldDirty: true})}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  >
                    <option value={3000}>3 Seconds (Fast)</option>
                    <option value={5000}>5 Seconds (Recommended)</option>
                    <option value={6000}>6 Seconds (Standard)</option>
                    <option value={8000}>8 Seconds (Slow)</option>
                    <option value={10000}>10 Seconds (Very Slow)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Indicator Dots Style</label>
                  <select
                    value={form.watch("hub_hero_carousel_dots_style")}
                    onChange={(e) => form.setValue('hub_hero_carousel_dots_style', e.target.value, {shouldDirty: true})}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  >
                    <option value="pill">Pill Dots</option>
                    <option value="circle">Circle Dots</option>
                    <option value="numbers">Numbers / Counter</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 pb-2">
                {[
                  { key: 'hub_hero_carousel_autoplay' as const, label: 'Auto-Play Slide Rotation', description: 'Automatically advance to the next slide.' },
                  { key: 'hub_hero_carousel_show_arrows' as const, label: 'Navigation Arrows', description: 'Show left/right arrow buttons on the banner.' },
                ].map((t: any) => renderToggle(formProps, t))}
              </div>
              <div>
                <HeroCarouselEditor
                  value={form.watch("hub_hero_carousel_slides")}
                  onChange={(next) => form.setValue('hub_hero_carousel_slides', next, {shouldDirty: true})}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </form>
  );
}
