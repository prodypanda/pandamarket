'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { fetchWithCsrf } from '@/lib/api';
import { PlatformSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { renderTextInput, renderNumberInput, renderToggle } from '@/components/admin/settings/SettingsFormHelpers';
import { Save, FileText, Bell, Cloud, Truck, Shield, Mail, UploadCloud, BarChart3, MessageSquare, Construction } from 'lucide-react';
import { SectionHeader } from '@/components/admin/SectionHeader';

const schema = z.any();

export default function OperationsSettingsPage() {
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
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const formProps = { register: form.register, errors: form.formState.errors, watch: form.watch, setValue: form.setValue };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm sticky top-4 z-10">
        <h2 className="text-lg font-bold text-slate-800 ml-4">Operations & System</h2>
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:opacity-50">
          {saving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader icon={<Construction className="h-5 w-5" />} title="Maintenance Mode" description="Temporarily disable access to the storefront." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {renderToggle(formProps, { key: "maintenance_enabled" as any, label: 'Maintenance Mode', description: 'Enable to show maintenance page to visitors.' })}
          {renderTextInput(formProps, "maintenance_message" as any, 'Maintenance Message', 'We are currently performing maintenance. Please check back later.')}
          {renderTextInput(formProps, "maintenance_bypass_key" as any, 'Bypass Key', 'Secret key to access site during maintenance')}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader icon={<Bell className="h-5 w-5" />} title="Notifications" description="Configure system notifications and webhooks." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { key: "notifications_in_app_enabled" as any, label: 'In-App Notifications', description: 'Show notification bell in admin dashboard.' },
            { key: "notifications_realtime_enabled" as any, label: 'Real-time Updates', description: 'Use WebSocket for instant notifications.' },
            { key: "notifications_email_enabled" as any, label: 'Email Notifications', description: 'Send critical alerts via email.' },
            { key: "notifications_whatsapp_enabled" as any, label: 'WhatsApp Notifications', description: 'Send alerts via WhatsApp.' },
          ].map((t: any) => renderToggle(formProps, t))}
        </div>
        
        <div className="mt-6 space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">WhatsApp Provider</label>
          <select
            value={form.watch("notifications_whatsapp_provider" as any) || 'twilio'}
            onChange={(e) => form.setValue("notifications_whatsapp_provider" as any as any, e.target.value, {shouldDirty: true})}
            className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
          >
            <option value="twilio">Twilio</option>
            <option value="meta">Meta Official API</option>
            <option value="messagebird">MessageBird</option>
          </select>
        </div>
      </section>
      
      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader icon={<UploadCloud className="h-5 w-5" />} title="Image Processing" description="Configure image optimization and cropping settings." />
        <div className="space-y-8">
          {[
            { title: 'Storefront Logo', desc: 'Used in header navigation', wKey: 'image_logo_max_width', hKey: 'image_logo_max_height', cropKey: 'image_logo_crop_mode', minW: 100, maxW: 600, minH: 20, maxH: 200 },
            { title: 'Product Images', desc: 'Main product gallery', wKey: 'image_product_max_width', hKey: 'image_product_max_height', cropKey: 'image_product_crop_mode', minW: 800, maxW: 2048, minH: 800, maxH: 2048 },
            { title: 'Category Banners', desc: 'Category header images', wKey: 'image_banner_max_width', hKey: 'image_banner_max_height', cropKey: 'image_banner_crop_mode', minW: 1200, maxW: 2560, minH: 300, maxH: 800 },
          ].map((p: any) => (
            <div key={p.title} className="rounded-xl border border-slate-100 bg-stone-50/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                  <UploadCloud className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{p.title}</h4>
                  <p className="text-xs font-semibold text-slate-400">{p.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {renderNumberInput(formProps, p.wKey, 'Width', 'px', p.minW, p.maxW)}
                {renderNumberInput(formProps, p.hKey, 'Height', 'px', p.minH, p.maxH)}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Crop Mode</label>
                  <select
                    value={form.watch(p.cropKey as any) || 'inside'}
                    onChange={(e) => form.setValue(p.cropKey as any, e.target.value, {shouldDirty: true})}
                    className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                  >
                    <option value="cover">Cover (crop to fill)</option>
                    <option value="inside">Inside (fit without crop)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}