'use client';

import { useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface PlatformSettings {
  order_splitting_enabled: boolean;
  default_retention_days_flouci: number;
  default_retention_days_konnect: number;
  default_retention_days_mandat: number;
  default_retention_days_cod: number;
  min_withdrawal_amount: number;
  max_upload_size_mb: number;
  mandat_recipient_name: string;
  mandat_recipient_cin: string;
  mandat_recipient_city: string;
  platform_commission_rate: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  order_splitting_enabled: true,
  default_retention_days_flouci: 7,
  default_retention_days_konnect: 7,
  default_retention_days_mandat: 14,
  default_retention_days_cod: 14,
  min_withdrawal_amount: 20,
  max_upload_size_mb: 10,
  mandat_recipient_name: 'PandaMarket SARL',
  mandat_recipient_cin: '',
  mandat_recipient_city: 'Tunis',
  platform_commission_rate: 15,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/pd/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#16C784]/10 rounded-lg">
            <Settings className="h-6 w-6 text-[#16C784]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-sm text-gray-500">Configure global platform behavior.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#16C784] text-white rounded-lg text-sm font-medium hover:bg-[#14b876] transition-colors disabled:opacity-50"
        >
          {saving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Order Splitting */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Splitting</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Enable Order Splitting</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When enabled, multi-vendor carts create separate fulfillments per vendor.
            </p>
          </div>
          <button
            onClick={() => updateSetting('order_splitting_enabled', !settings.order_splitting_enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.order_splitting_enabled ? 'bg-[#16C784]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.order_splitting_enabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </section>

      {/* Retention Periods */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Periods</h3>
        <p className="text-xs text-gray-500 mb-4">
          Number of days funds are held before becoming available in the vendor wallet.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'default_retention_days_flouci' as const, label: 'Flouci' },
            { key: 'default_retention_days_konnect' as const, label: 'Konnect' },
            { key: 'default_retention_days_mandat' as const, label: 'Mandat Minute' },
            { key: 'default_retention_days_cod' as const, label: 'COD' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={settings[key]}
                  onChange={(e) => updateSetting(key, parseInt(e.target.value) || 7)}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Financial Settings */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Free Plan Commission Rate
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={settings.platform_commission_rate}
                onChange={(e) => updateSetting('platform_commission_rate', parseFloat(e.target.value) || 15)}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Withdrawal Amount
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={settings.min_withdrawal_amount}
                onChange={(e) => updateSetting('min_withdrawal_amount', parseFloat(e.target.value) || 20)}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
              />
              <span className="text-sm text-gray-500">TND</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mandat Minute Recipient Info */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mandat Minute Recipient</h3>
        <p className="text-xs text-gray-500 mb-4">
          This information is displayed to customers when they choose Mandat Minute payment.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
            <input
              type="text"
              value={settings.mandat_recipient_name}
              onChange={(e) => updateSetting('mandat_recipient_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CIN Number</label>
              <input
                type="text"
                value={settings.mandat_recipient_cin}
                onChange={(e) => updateSetting('mandat_recipient_cin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={settings.mandat_recipient_city}
                onChange={(e) => updateSetting('mandat_recipient_city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Upload Limits */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Limits</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max File Upload Size
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={settings.max_upload_size_mb}
              onChange={(e) => updateSetting('max_upload_size_mb', parseInt(e.target.value) || 10)}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
            />
            <span className="text-sm text-gray-500">MB</span>
          </div>
        </div>
      </section>
    </div>
  );
}
