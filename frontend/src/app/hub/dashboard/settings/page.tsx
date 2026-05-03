'use client';

import { useState, useEffect } from 'react';
import { Settings, Palette, Globe, Truck, Save, CheckCircle, AlertCircle } from 'lucide-react';

type Tab = 'store' | 'theme' | 'domain' | 'shipping';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('store');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Store settings
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Theme
  const [selectedTheme, setSelectedTheme] = useState('modern');

  // Domain
  const [customDomain, setCustomDomain] = useState('');

  // Shipping
  const [shippingMode, setShippingMode] = useState('standard');

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const res = await fetch('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const store = data.store;
        setStoreName(store.name || '');
        setStoreDescription(store.description || '');
        setContactEmail(store.settings?.contact_email || '');
        setContactPhone(store.settings?.contact_phone || '');
        setSelectedTheme(store.theme_id || 'modern');
        setCustomDomain(store.custom_domain || '');
        setShippingMode(store.shipping_mode || 'standard');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  const saveStoreSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: {
            name: storeName,
            description: storeDescription,
            contact_email: contactEmail,
            contact_phone: contactPhone,
          },
        }),
      });
      if (res.ok) {
        showFeedback('Paramètres sauvegardés');
      } else {
        const data = await res.json();
        showFeedback(data.error?.message || 'Erreur', true);
      }
    } catch {
      showFeedback('Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pd/stores/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme_id: selectedTheme }),
      });
      if (res.ok) {
        showFeedback('Thème mis à jour');
      } else {
        const data = await res.json();
        showFeedback(data.error?.message || 'Erreur', true);
      }
    } catch {
      showFeedback('Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const saveDomain = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pd/stores/me/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_domain: customDomain }),
      });
      if (res.ok) {
        showFeedback('Domaine mis à jour');
      } else {
        const data = await res.json();
        showFeedback(data.error?.message || 'Erreur', true);
      }
    } catch {
      showFeedback('Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const saveShipping = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pd/stores/me/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shipping_mode: shippingMode }),
      });
      if (res.ok) {
        showFeedback('Mode de livraison mis à jour');
      } else {
        const data = await res.json();
        showFeedback(data.error?.message || 'Erreur', true);
      }
    } catch {
      showFeedback('Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'store', label: 'Boutique', icon: Settings },
    { id: 'theme', label: 'Thème', icon: Palette },
    { id: 'domain', label: 'Domaine', icon: Globe },
    { id: 'shipping', label: 'Livraison', icon: Truck },
  ];

  const themes = [
    { id: 'modern', name: 'Modern', desc: 'Design épuré et contemporain' },
    { id: 'minimal', name: 'Minimal', desc: 'Simplicité et élégance' },
    { id: 'classic', name: 'Classic', desc: 'Style traditionnel et professionnel' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-100 rounded w-full" />
            <div className="h-40 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      {/* Feedback */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-white text-[#16C784] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Store Settings Tab */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Informations de la boutique</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
                />
              </div>
            </div>
            <button
              onClick={saveStoreSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}

        {/* Theme Tab */}
        {activeTab === 'theme' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Choisir un thème</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedTheme === theme.id
                      ? 'border-[#16C784] bg-[#16C784]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="h-24 bg-gray-100 rounded-lg mb-3" />
                  <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{theme.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={saveTheme}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Appliquer le thème'}
            </button>
          </div>
        )}

        {/* Domain Tab */}
        {activeTab === 'domain' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Domaine personnalisé</h2>
            <p className="text-sm text-gray-500">
              Connectez votre propre domaine à votre boutique. Disponible à partir du plan Starter.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domaine</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="www.maboutique.tn"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ajoutez un enregistrement CNAME pointant vers pandamarket.tn
              </p>
            </div>
            <button
              onClick={saveDomain}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder le domaine'}
            </button>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === 'shipping' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Mode de livraison</h2>
            <div className="space-y-3">
              {[
                { id: 'standard', name: 'Standard', desc: 'Livraison standard 3-5 jours' },
                { id: 'express', name: 'Express', desc: 'Livraison express 1-2 jours' },
                { id: 'pickup', name: 'Retrait en magasin', desc: 'Le client récupère sa commande' },
              ].map((mode) => (
                <label
                  key={mode.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    shippingMode === mode.id
                      ? 'border-[#16C784] bg-[#16C784]/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping_mode"
                    checked={shippingMode === mode.id}
                    onChange={() => setShippingMode(mode.id)}
                    className="text-[#16C784] focus:ring-[#16C784]"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{mode.name}</p>
                    <p className="text-xs text-gray-500">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={saveShipping}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
