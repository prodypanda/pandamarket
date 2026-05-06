'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import { Settings, Palette, Globe, Truck, Save, CheckCircle, AlertCircle, Sparkles, ImageIcon, UploadCloud, X } from 'lucide-react';
import { themes, type ThemeId, type ThemeCustomization } from '../../../../lib/themes';
import { ThemeCustomizer } from '../../../../components/dashboard/ThemeCustomizer';

type Tab = 'store' | 'theme' | 'domain' | 'shipping';

interface MediaItem {
  url: string;
  product_id: string;
  product_title: string;
  alt_text?: string | null;
}

async function getErrorMessage(res: Response, fallback = 'Erreur') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

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
  const [logoUrl, setLogoUrl] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Theme
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('modern');
  const [themeCustomization, setThemeCustomization] = useState<ThemeCustomization>({});

  // Domain
  const [customDomain, setCustomDomain] = useState('');

  // Shipping
  const [shippingMode, setShippingMode] = useState('standard');

  const fetchStoreSettings = async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const store = data.store;
        setStoreName(store.name || '');
        setStoreDescription(store.settings?.store_description || store.settings?.description || '');
        setContactEmail(store.settings?.contact_email || '');
        setContactPhone(store.settings?.contact_phone || '');
        setLogoUrl(store.settings?.logo_url || '');
        setSelectedTheme((store.theme_id || 'modern') as ThemeId);
        setThemeCustomization(store.settings?.themeCustomization || {});
        setCustomDomain(store.custom_domain || '');
        setShippingMode(store.shipping_mode || 'standard');
      } else {
        setError(await getErrorMessage(res, 'Impossible de charger les paramètres'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const fetchMediaItems = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media?limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.data || []);
      }
    } catch {
      setMediaItems([]);
    }
  }, []);

  useEffect(() => {
    fetchMediaItems();
  }, [fetchMediaItems]);

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
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: {
            name: storeName,
            store_description: storeDescription,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            logo_url: logoUrl,
          },
        }),
      });
      if (res.ok) {
        showFeedback('Paramètres sauvegardés');
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const uploadStoreLogo = async (file: File | null) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Veuillez choisir une image JPG, PNG ou WebP.');
      }

      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          purpose: 'product_image',
        }),
      });

      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, 'Upload impossible'));
      const presignData = await presignRes.json();
      const uploadUrl = presignData.upload_url as string | undefined;
      const publicUrl = presignData.public_url as string | undefined;
      if (!uploadUrl || !publicUrl) throw new Error('URL upload manquante');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload impossible');

      setLogoUrl(publicUrl);
      await fetchMediaItems();
      showFeedback('Logo sélectionné. Cliquez sur Sauvegarder pour appliquer.');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Upload impossible', true);
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme_id: selectedTheme }),
      });
      if (res.ok) {
        showFeedback('Thème mis à jour');
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const saveThemeCustomization = useCallback(async (customization: ThemeCustomization) => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: { themeCustomization: customization },
        }),
      });
      if (res.ok) {
        setThemeCustomization(customization);
        showFeedback('Personnalisation sauvegardée');
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
    }
  }, []);

  const saveDomain = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_domain: customDomain }),
      });
      if (res.ok) {
        showFeedback('Domaine mis à jour');
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const saveShipping = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shipping_mode: shippingMode }),
      });
      if (res.ok) {
        showFeedback('Mode de livraison mis à jour');
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
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

  const themeList: { id: ThemeId; name: string; desc: string; free: boolean }[] = [
    { id: 'minimal', name: 'Minimal', desc: 'Simplicité et élégance', free: true },
    { id: 'classic', name: 'Classic', desc: 'Style traditionnel', free: true },
    { id: 'modern', name: 'Modern', desc: 'Design contemporain', free: true },
    { id: 'boutique', name: 'Boutique', desc: 'Luxe et raffinement', free: true },
    { id: 'artisan', name: 'Artisan', desc: 'Fait main et naturel', free: true },
    { id: 'elegance', name: 'Elegance', desc: 'Minimaliste haut de gamme', free: true },
    { id: 'coastal', name: 'Coastal', desc: 'Bord de mer', free: true },
    { id: 'garden', name: 'Garden', desc: 'Nature et bio', free: true },
    { id: 'fresh', name: 'Fresh', desc: 'Épicerie et santé', free: true },
    { id: 'sahara', name: 'Sahara', desc: 'Tons chauds tunisiens', free: true },
    { id: 'medina', name: 'Medina', desc: 'Marketplace traditionnelle', free: true },
    { id: 'craft', name: 'Craft', desc: 'DIY et artisanat', free: true },
    { id: 'techhub', name: 'TechHub', desc: 'Électronique et tech', free: false },
    { id: 'flavor', name: 'Flavor', desc: 'Restaurant et food', free: false },
    { id: 'neon', name: 'Neon', desc: 'Gaming et dark mode', free: false },
    { id: 'urban', name: 'Urban', desc: 'Street fashion', free: false },
    { id: 'studio', name: 'Studio', desc: 'Portfolio et art', free: false },
    { id: 'luxe', name: 'Luxe', desc: 'Bijoux et montres', free: false },
    { id: 'digital', name: 'Digital', desc: 'SaaS et logiciels', free: false },
    { id: 'kids', name: 'Kids', desc: 'Enfants et jouets', free: false },
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
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la boutique</label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {logoUrl ? (
                      <img src={logoUrl} alt={storeName || 'Logo boutique'} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-7 w-7 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{logoUrl ? 'Logo sélectionné' : 'Aucun logo'}</p>
                    <p className="text-xs text-gray-500">Téléversez un logo ou choisissez une image de votre galerie.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
                    >
                      Retirer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogoPicker(true);
                      void fetchMediaItems();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#16C784] hover:text-[#16C784]"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Galerie
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#16C784] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14b876]">
                    <UploadCloud className="h-4 w-4" />
                    {uploadingLogo ? 'Upload...' : 'Uploader'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingLogo}
                      onChange={(event) => void uploadStoreLogo(event.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
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
          <div className="space-y-6">
            {/* Theme Selector */}
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Choisir un thème</h2>
              <p className="text-xs text-gray-500 mb-4">20 thèmes disponibles. Les thèmes premium nécessitent un achat.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {themeList.map((t) => {
                  const cfg = themes[t.id];
                  const preset = cfg?.colorPresets[0];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedTheme === t.id
                          ? 'border-[#16C784] bg-[#16C784]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Mini color preview */}
                      <div className="h-16 rounded-lg mb-2 overflow-hidden relative" style={{ backgroundColor: preset?.background || '#F3F4F6' }}>
                        <div className="absolute top-0 left-0 right-0 h-5" style={{ backgroundColor: preset?.headerBg || '#FFFFFF' }} />
                        <div className="absolute bottom-0 left-0 right-0 h-4" style={{ backgroundColor: preset?.footerBg || '#1A1A2E' }} />
                        <div className="absolute top-6 left-2 flex gap-1">
                          {preset && [preset.primary, preset.accent, preset.secondary].map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{t.name}</h3>
                        {!t.free && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full flex-shrink-0">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={saveTheme}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 mt-4 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Appliquer le thème'}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Theme Customizer */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#16C784]" />
                <h2 className="font-semibold text-gray-900">Personnalisation avancée</h2>
              </div>
              <ThemeCustomizer
                themeId={selectedTheme}
                initialCustomization={themeCustomization}
                onSave={saveThemeCustomization}
              />
            </div>
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
      {showLogoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Galerie de la boutique</h2>
                <p className="text-sm text-gray-500">Choisissez une image déjà uploadée pour votre logo.</p>
              </div>
              <button type="button" onClick={() => setShowLogoPicker(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-6">
              {mediaItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                  {mediaItems.map((item) => (
                    <button
                      type="button"
                      key={`${item.url}-${item.product_id}`}
                      onClick={() => {
                        setLogoUrl(item.url);
                        setShowLogoPicker(false);
                        showFeedback('Logo sélectionné. Cliquez sur Sauvegarder pour appliquer.');
                      }}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-all hover:border-[#16C784] hover:shadow-md"
                    >
                      <div className="aspect-square bg-gray-100">
                        <img src={item.url} alt={item.alt_text || item.product_title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-gray-700">{item.product_title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500">
                  Aucune image disponible. Uploadez un logo pour commencer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
