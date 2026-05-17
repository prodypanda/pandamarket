'use client';

import { fetchWithCsrf } from '@/lib/api';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import { useState, useEffect, useCallback } from 'react';
import { Settings, Palette, Globe, Truck, Save, CheckCircle, AlertCircle, Sparkles, ImageIcon, UploadCloud, X, Clock3, ShieldCheck, Link2, MapPin, Share2, Construction, AlertTriangle, Mail } from 'lucide-react';
import { themes, type ThemeId, type ThemeCustomization } from '../../../../lib/themes';
import { ThemeCustomizer } from '../../../../components/dashboard/ThemeCustomizer';
import { AccountSecurityActivityPanel } from '../../../../components/AccountSecurityActivityPanel';
import { AccountTwoFactorPanel } from '../../../../components/AccountTwoFactorPanel';
import { LocaleSwitcher } from '../../../../components/LocaleSwitcher';
import { useLocale } from '../../../../contexts/LocaleContext';
import { getSellerTypeOptions, type SellerTypeValue } from '../../../../lib/seller-type';

type Tab = 'store' | 'security' | 'theme' | 'domain' | 'shipping' | 'emails' | 'payments';

type SocialPlatform = 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube' | 'linkedin' | 'whatsapp' | 'telegram' | 'pinterest' | 'snapchat';

type SocialLinks = Record<SocialPlatform, string>;

const socialPlatforms: { key: SocialPlatform; label: string; placeholder: string }[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/votrepage' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/votreboutique' },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/votreboutique' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@votreboutique' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@votreboutique' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/votreboutique' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/216...' },
  { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/votreboutique' },
  { key: 'pinterest', label: 'Pinterest', placeholder: 'https://pinterest.com/votreboutique' },
  { key: 'snapchat', label: 'Snapchat', placeholder: 'https://snapchat.com/add/votreboutique' },
];

const emptySocialLinks = socialPlatforms.reduce((acc, platform) => {
  acc[platform.key] = '';
  return acc;
}, {} as SocialLinks);

interface MediaItem {
  url: string;
  product_id: string;
  product_title: string;
  alt_text?: string | null;
}

interface SellerTypeChangeRequest {
  requested_type?: SellerTypeValue;
  status?: string;
  requested_at?: string;
  reviewed_at?: string | null;
  cancelled_at?: string | null;
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
  const { t, dir } = useLocale();
  const sellerTypeOptions = getSellerTypeOptions(t);
  const isRtl = dir === 'rtl';
  const [activeTab, setActiveTab] = useState<Tab>('store');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingSellerTypeRequest, setCancellingSellerTypeRequest] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [marketplaceName, setMarketplaceName] = useState('PandaMarket');

  // Store settings
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [sellerType, setSellerType] = useState<SellerTypeValue>('retailer');
  const [currentSellerType, setCurrentSellerType] = useState<SellerTypeValue>('retailer');
  const [pendingSellerTypeRequest, setPendingSellerTypeRequest] = useState<SellerTypeChangeRequest | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('TN');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(emptySocialLinks);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLightUrl, setLogoLightUrl] = useState('');
  const [logoDarkUrl, setLogoDarkUrl] = useState('');
  const [marketplaceHeaderImageUrl, setMarketplaceHeaderImageUrl] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [logoPickerTarget, setLogoPickerTarget] = useState<'default' | 'light' | 'dark' | null>(null);
  const [showHeaderImagePicker, setShowHeaderImagePicker] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);

  // Maintenance mode
  const [storeStatus, setStoreStatus] = useState('verified');
  const [storeIsVerified, setStoreIsVerified] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Theme
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('modern');
  const [themeCustomization, setThemeCustomization] = useState<ThemeCustomization>({});

  // Domain
  const [customDomain, setCustomDomain] = useState('');

  // Shipping
  const [shippingMode, setShippingMode] = useState('self_managed');
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [returnsPolicy, setReturnsPolicy] = useState('');
  const [paymentPolicy, setPaymentPolicy] = useState('');

  const fetchStoreSettings = async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const store = data.store;
        const loadedSellerType = (store.seller_type || 'retailer') as SellerTypeValue;
        setStoreName(store.name || '');
        setSellerType(loadedSellerType);
        setCurrentSellerType(loadedSellerType);
        setPendingSellerTypeRequest(store.settings?.seller_type_change_request || null);
        setStoreDescription(store.settings?.store_description || store.settings?.description || '');
        setContactEmail(store.settings?.contact_email || '');
        setContactPhone(store.settings?.contact_phone || '');
        setAddress(store.settings?.address || '');
        setCity(store.settings?.city || '');
        setCountry(store.settings?.country || 'TN');
        setMapEmbedUrl(store.settings?.map_embed_url || '');
        setSocialLinks({
          ...emptySocialLinks,
          ...(store.settings?.social || {}),
        });
        setLogoUrl(store.settings?.logo_url || '');
        setLogoLightUrl(store.settings?.logo_light_url || '');
        setLogoDarkUrl(store.settings?.logo_dark_url || '');
        setMarketplaceHeaderImageUrl(store.settings?.marketplace_header_image_url || '');
        setSelectedTheme((store.theme_id || 'modern') as ThemeId);
        setThemeCustomization(store.settings?.themeCustomization || {});
        setCustomDomain(store.custom_domain || '');
        setShippingMode(store.shipping_mode || 'self_managed');
        setShippingPolicy(store.settings?.shipping_policy || '');
        setReturnsPolicy(store.settings?.returns_policy || '');
        setPaymentPolicy(store.settings?.payment_policy || '');
        setStoreStatus(store.status || 'verified');
        setStoreIsVerified(Boolean(store.is_verified));
        setMaintenanceMessage(store.settings?.maintenance_message || '');
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
    let active = true;
    async function fetchMarketplaceSettings() {
      try {
        const res = await fetchWithCsrf('/api/pd/marketplace/settings', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMarketplaceName(data.data?.marketplace_name || 'PandaMarket');
      } catch {
        if (active) setMarketplaceName('PandaMarket');
      }
    }
    fetchMarketplaceSettings();
    return () => {
      active = false;
    };
  }, []);

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

  const updateSocialLink = (platform: SocialPlatform, value: string) => {
    setSocialLinks((current) => ({ ...current, [platform]: value }));
  };

  const cleanSocialLinks = () => {
    return socialPlatforms.reduce<Partial<SocialLinks>>((acc, platform) => {
      const value = socialLinks[platform.key].trim();
      if (value) acc[platform.key] = value;
      return acc;
    }, {});
  };

  const saveStoreSettings = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          seller_type: sellerType === currentSellerType ? undefined : sellerType,
          settings: {
            name: storeName,
            store_description: storeDescription,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            address,
            city,
            country,
            map_embed_url: mapEmbedUrl,
            social: cleanSocialLinks(),
            logo_url: logoUrl,
            logo_light_url: logoLightUrl,
            logo_dark_url: logoDarkUrl,
            marketplace_header_image_url: marketplaceHeaderImageUrl,
            shipping_policy: shippingPolicy,
            returns_policy: returnsPolicy,
            payment_policy: paymentPolicy,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const nextStore = data?.store;
        if (nextStore?.seller_type) {
          const updatedSellerType = nextStore.seller_type as SellerTypeValue;
          setSellerType(updatedSellerType);
          setCurrentSellerType(updatedSellerType);
        }
        setPendingSellerTypeRequest(nextStore?.settings?.seller_type_change_request || null);
        if (sellerType === currentSellerType) {
          showFeedback('Paramètres sauvegardés');
          return;
        }
        showFeedback(
          data?.pending_approval
            ? t('sellerTypes.approval.requestSubmitted')
            : t('sellerTypes.approval.autoApproved'),
        );
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const cancelSellerTypeRequest = async () => {
    setCancellingSellerTypeRequest(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/seller-type-request/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setPendingSellerTypeRequest(data?.store?.settings?.seller_type_change_request || null);
        setSellerType(currentSellerType);
        showFeedback(t('sellerTypes.approval.cancelled'));
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
    } finally {
      setCancellingSellerTypeRequest(false);
    }
  };

  const updateLogoTarget = (target: 'default' | 'light' | 'dark', url: string) => {
    if (target === 'light') {
      setLogoLightUrl(url);
      return;
    }
    if (target === 'dark') {
      setLogoDarkUrl(url);
      return;
    }
    setLogoUrl(url);
  };

  const uploadStoreLogo = async (file: File | null, target: 'default' | 'light' | 'dark' = 'default') => {
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

      updateLogoTarget(target, publicUrl);
      await fetchMediaItems();
      showFeedback('Logo sélectionné. Cliquez sur Sauvegarder pour appliquer.');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Upload impossible', true);
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadMarketplaceHeaderImage = async (file: File | null) => {
    if (!file) return;
    setUploadingHeaderImage(true);
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

      setMarketplaceHeaderImageUrl(publicUrl);
      await fetchMediaItems();
      showFeedback('Image de couverture sélectionnée. Cliquez sur Sauvegarder pour appliquer.');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Upload impossible', true);
    } finally {
      setUploadingHeaderImage(false);
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
      if (!res.ok) {
        showFeedback(await getErrorMessage(res), true);
        return;
      }

      const policyRes = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: {
            shipping_policy: shippingPolicy,
            returns_policy: returnsPolicy,
            payment_policy: paymentPolicy,
          },
        }),
      });
      if (!policyRes.ok) {
        showFeedback(await getErrorMessage(policyRes), true);
        return;
      }

      showFeedback('Livraison et politiques publiques mises à jour');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'store', label: 'Boutique', icon: Settings },
    { id: 'security', label: 'Sécurité', icon: ShieldCheck },
    { id: 'theme', label: 'Thème', icon: Palette },
    { id: 'domain', label: 'Domaine', icon: Globe },
    { id: 'shipping', label: 'Livraison', icon: Truck },
    { id: 'emails', label: 'Emails', icon: Mail },
  ];
  const hasPendingSellerTypeRequest = pendingSellerTypeRequest?.status === 'pending' && Boolean(pendingSellerTypeRequest.requested_type);
  const pendingSellerTypeLabel = hasPendingSellerTypeRequest
    ? sellerTypeOptions.find((option) => option.value === pendingSellerTypeRequest?.requested_type)?.label || pendingSellerTypeRequest?.requested_type
    : '';

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
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={dir}>
      <div className="relative overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-xl shadow-red-950/10">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex rounded-full border border-amber-200/30 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
            Seller dashboard
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Paramètres</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
            Gérez votre identité boutique, vos visuels, votre thème, votre domaine et vos politiques publiques dans une interface claire.
          </p>
        </div>
      </div>

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
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-amber-100 bg-amber-50/60 p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors flex-1 ${
              activeTab === tab.id
                ? 'bg-white text-[#B91C1C] shadow-sm ring-1 ring-amber-100'
                : 'text-slate-500 hover:bg-white/60 hover:text-[#7F1D1D]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-200/40">
        {/* Store Settings Tab */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-red-50/40 p-5">
              <h2 className="text-lg font-black text-slate-950">Informations de la boutique</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Présentez votre boutique avec des informations propres, complètes et rassurantes.</p>
            </div>
            <div className="rounded-2xl border border-[#B91C1C]/15 bg-[#B91C1C]/5 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#B91C1C]">Étape d’onboarding</p>
                  <h3 className="mt-1 text-base font-black text-slate-950">Type vendeur, langue et pays</h3>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Choisissez votre modèle de vente, confirmez votre pays d’origine et utilisez le sélecteur de langue du dashboard pour adapter l’interface avant de configurer votre vitrine.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-400">Langue</span>
                  <LocaleSwitcher />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('sellerTypes.title')}</label>
              {hasPendingSellerTypeRequest && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold">
                          {t('sellerTypes.approval.pendingRequest', { type: String(pendingSellerTypeLabel) })}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          {t('sellerTypes.approval.pendingDetails')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                          <span className="rounded-full bg-white px-3 py-1 text-amber-700">
                            {t('sellerTypes.approval.currentType')}: {sellerTypeOptions.find((option) => option.value === currentSellerType)?.label || currentSellerType}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-amber-700">
                            {t('sellerTypes.approval.requestedType')}: {pendingSellerTypeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={cancelSellerTypeRequest}
                      disabled={cancellingSellerTypeRequest}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-white px-4 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancellingSellerTypeRequest ? t('sellerTypes.approval.cancelling') : t('sellerTypes.approval.cancelRequest')}
                    </button>
                  </div>
                </div>
              )}
              <p className="mb-3 text-xs leading-5 text-gray-500">
                {t('sellerTypes.approval.monthlyLimit')}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {sellerTypeOptions.map((option) => {
                  const selected = sellerType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (!hasPendingSellerTypeRequest) setSellerType(option.value);
                      }}
                      disabled={hasPendingSellerTypeRequest}
                      className={`rounded-xl border p-4 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isRtl ? 'text-right' : 'text-left'} ${
                        selected
                          ? 'border-[#B91C1C] bg-amber-50 shadow-sm ring-2 ring-amber-100'
                          : 'border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/40'
                      }`}
                    >
                      <span className="block text-sm font-bold text-gray-900">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-gray-500">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
                />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-[#B91C1C]" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Adresse & carte</h3>
                  <p className="text-xs text-gray-500">Ces informations apparaissent sur votre page vendeur et dans le pied de page de votre boutique.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Google Maps embed</label>
                  <input
                    type="url"
                    value={mapEmbedUrl}
                    onChange={(event) => setMapEmbedUrl(event.target.value)}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Utilisez uniquement une URL d&apos;intégration Google Maps.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-start gap-3">
                <Share2 className="mt-0.5 h-5 w-5 text-[#B91C1C]" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Réseaux sociaux</h3>
                  <p className="text-xs text-gray-500">Ajoutez vos profils publics pour rassurer les clients et générer du trafic.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {socialPlatforms.map((platform) => (
                  <div key={platform.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{platform.label}</label>
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={socialLinks[platform.key]}
                        onChange={(event) => updateSocialLink(platform.key, event.target.value)}
                        placeholder={platform.placeholder}
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logos de la boutique</label>
              <p className="mb-4 text-xs text-gray-500">Le logo sombre est utilisé sur fond clair. Le logo clair est utilisé sur fond sombre. Le logo principal reste le fallback.</p>
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  { key: 'default' as const, label: 'Logo principal', value: logoUrl, setter: setLogoUrl, previewClass: 'bg-white' },
                  { key: 'dark' as const, label: 'Logo sombre', value: logoDarkUrl, setter: setLogoDarkUrl, previewClass: 'bg-white' },
                  { key: 'light' as const, label: 'Logo clair', value: logoLightUrl, setter: setLogoLightUrl, previewClass: 'bg-slate-950' },
                ].map((logo) => (
                  <div key={logo.key} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className={`flex h-24 items-center justify-center overflow-hidden rounded-xl border border-gray-200 ${logo.previewClass}`}>
                      {logo.value ? (
                        <div
                          aria-label={`${storeName || 'Logo boutique'} ${logo.label}`}
                          role="img"
                          className="h-full w-full bg-contain bg-center bg-no-repeat"
                          style={{ backgroundImage: `url(${logo.value})` }}
                        />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-gray-300" />
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-gray-800">{logo.label}</p>
                      <p className="text-xs text-gray-500">{logo.value ? 'Image sélectionnée' : 'Aucune image'}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {logo.value && (
                        <button
                          type="button"
                          onClick={() => logo.setter('')}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Retirer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPickerTarget(logo.key);
                          void fetchMediaItems();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-[#B91C1C] hover:text-[#B91C1C]"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Galerie
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#991B1B]">
                        <UploadCloud className="h-4 w-4" />
                        {uploadingLogo ? 'Upload...' : 'Uploader'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingLogo}
                          onChange={(event) => void uploadStoreLogo(event.target.files?.[0] || null, logo.key)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Image d&apos;en-tête marketplace</label>
              <div className="space-y-4">
                <div className="h-40 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  {marketplaceHeaderImageUrl ? (
                    <div
                      aria-label="Image d'en-tête marketplace"
                      role="img"
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${marketplaceHeaderImageUrl})` }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{marketplaceHeaderImageUrl ? 'Image sélectionnée' : 'Aucune image'}</p>
                    <p className="text-xs text-gray-500">Cette image apparaît comme couverture sur votre page vendeur dans la marketplace.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {marketplaceHeaderImageUrl && (
                      <button
                        type="button"
                        onClick={() => setMarketplaceHeaderImageUrl('')}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
                      >
                        Retirer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderImagePicker(true);
                        void fetchMediaItems();
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#B91C1C] hover:text-[#B91C1C]"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Galerie
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#B91C1C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#991B1B]">
                      <UploadCloud className="h-4 w-4" />
                      {uploadingHeaderImage ? 'Upload...' : 'Uploader'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingHeaderImage}
                        onChange={(event) => void uploadMarketplaceHeaderImage(event.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance Mode Toggle */}
            {(storeStatus === 'verified' || storeStatus === 'maintenance') && (
              <div className={`rounded-xl border p-4 ${storeStatus === 'maintenance' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <Construction className={`mt-0.5 h-5 w-5 ${storeStatus === 'maintenance' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Mode maintenance</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {storeStatus === 'maintenance'
                        ? storeIsVerified
                          ? 'Votre boutique est actuellement en maintenance et inaccessible aux visiteurs.'
                          : 'Votre boutique restera en maintenance jusqu’à votre vérification et sa publication.'
                        : 'Activez le mode maintenance pour rendre votre boutique temporairement inaccessible.'}
                    </p>
                    {storeStatus === 'maintenance' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Message de maintenance</label>
                        <textarea
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                          placeholder="Message affiché aux visiteurs pendant la maintenance..."
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={togglingMaintenance}
                      onClick={async () => {
                        setTogglingMaintenance(true);
                        try {
                          const enabling = storeStatus !== 'maintenance' || !storeIsVerified;
                          const res = await fetchWithCsrf('/api/pd/stores/me/maintenance', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              enabled: enabling,
                              maintenance_message: enabling ? maintenanceMessage : undefined,
                            }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setStoreStatus(data.store?.status || (enabling ? 'maintenance' : 'verified'));
                            setStoreIsVerified(Boolean(data.store?.is_verified));
                            showFeedback(
                              !storeIsVerified && storeStatus === 'maintenance'
                                ? 'Message de maintenance sauvegardé'
                                : enabling
                                  ? 'Mode maintenance activé'
                                  : 'Boutique remise en ligne',
                            );
                          } else {
                            showFeedback(await getErrorMessage(res), true);
                          }
                        } catch (err) {
                          showFeedback(err instanceof Error ? err.message : 'Erreur réseau', true);
                        } finally {
                          setTogglingMaintenance(false);
                        }
                      }}
                      className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                        storeStatus === 'maintenance' && storeIsVerified
                          ? 'bg-[#B91C1C] text-white hover:bg-[#991B1B]'
                          : 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {storeStatus === 'maintenance' && storeIsVerified && <AlertTriangle className="h-4 w-4" />}
                      {togglingMaintenance
                        ? 'En cours...'
                        : storeStatus === 'maintenance'
                          ? storeIsVerified
                            ? 'Remettre en ligne'
                            : 'Enregistrer le message'
                          : 'Activer la maintenance'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={saveStoreSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#B91C1C] text-white font-semibold rounded-lg hover:bg-[#991B1B] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <AccountTwoFactorPanel accentClass="bg-[#B91C1C]" />
            <AccountSecurityActivityPanel accentClass="bg-[#B91C1C]" compact />
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
                          ? 'border-[#B91C1C] bg-[#B91C1C]/5'
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
                className="flex items-center gap-2 px-6 py-2.5 mt-4 bg-[#B91C1C] text-white font-semibold rounded-lg hover:bg-[#991B1B] transition-colors disabled:opacity-50"
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
                <Sparkles className="w-4 h-4 text-[#B91C1C]" />
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ajoutez un enregistrement CNAME pointant vers le domaine fourni par {marketplaceName}.
              </p>
            </div>
            <button
              onClick={saveDomain}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#B91C1C] text-white font-semibold rounded-lg hover:bg-[#991B1B] transition-colors disabled:opacity-50"
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
                { id: 'self_managed', name: 'Gestion vendeur', desc: 'Vous gérez vous-même la livraison et le suivi client.' },
                { id: 'platform_unified', name: 'Plateforme unifiée', desc: `Utilise les intégrations ${marketplaceName} pour les bordereaux et le suivi.` },
              ].map((mode) => (
                <label
                  key={mode.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    shippingMode === mode.id
                      ? 'border-[#B91C1C] bg-[#B91C1C]/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping_mode"
                    checked={shippingMode === mode.id}
                    onChange={() => setShippingMode(mode.id)}
                    className="text-[#B91C1C] focus:ring-[#B91C1C]"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{mode.name}</p>
                    <p className="text-xs text-gray-500">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Politiques publiques</h3>
              <p className="mt-1 text-xs text-gray-500">
                Ces textes peuvent être affichés dans les blocs dynamiques Page Builder. Ne saisissez pas de clés API ou d&apos;informations privées.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Politique de livraison</label>
                  <textarea
                    value={shippingPolicy}
                    onChange={(event) => setShippingPolicy(event.target.value)}
                    rows={4}
                    placeholder="Délais estimés, zones desservies, suivi, frais ou conditions spécifiques..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retours & échanges</label>
                  <textarea
                    value={returnsPolicy}
                    onChange={(event) => setReturnsPolicy(event.target.value)}
                    rows={4}
                    placeholder="Conditions de retour, délais, produits exclus, procédure de contact..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Information paiement publique</label>
                  <textarea
                    value={paymentPolicy}
                    onChange={(event) => setPaymentPolicy(event.target.value)}
                    rows={4}
                    placeholder="Modes acceptés, paiement à la livraison, Mandat Minute ou consignes publiques..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C]"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={saveShipping}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#B91C1C] text-white font-semibold rounded-lg hover:bg-[#991B1B] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}

        {activeTab === 'emails' && (
          <EmailTemplateManager
            scope="storefront"
            title="Emails de la boutique"
            description="Personnalisez les emails envoyés à vos clients storefront, comme l'inscription acheteur, la commande placée et le paiement confirmé."
          />
        )}
      </div>
      {logoPickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Galerie de la boutique</h2>
                <p className="text-sm text-gray-500">Choisissez une image déjà uploadée pour votre logo.</p>
              </div>
              <button type="button" onClick={() => setLogoPickerTarget(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
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
                        updateLogoTarget(logoPickerTarget, item.url);
                        setLogoPickerTarget(null);
                        showFeedback('Logo sélectionné. Cliquez sur Sauvegarder pour appliquer.');
                      }}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-all hover:border-[#B91C1C] hover:shadow-md"
                    >
                      <div className="aspect-square bg-gray-100">
                        <div
                          aria-label={item.alt_text || item.product_title}
                          role="img"
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.url})` }}
                        />
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
      {showHeaderImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Galerie de la boutique</h2>
                <p className="text-sm text-gray-500">Choisissez une image pour l&apos;en-tête marketplace.</p>
              </div>
              <button type="button" onClick={() => setShowHeaderImagePicker(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-6">
              {mediaItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                  {mediaItems.map((item) => (
                    <button
                      type="button"
                      key={`header-${item.url}-${item.product_id}`}
                      onClick={() => {
                        setMarketplaceHeaderImageUrl(item.url);
                        setShowHeaderImagePicker(false);
                        showFeedback('Image sélectionnée. Cliquez sur Sauvegarder pour appliquer.');
                      }}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-all hover:border-[#B91C1C] hover:shadow-md"
                    >
                      <div className="aspect-square bg-gray-100">
                        <div
                          aria-label={item.alt_text || item.product_title}
                          role="img"
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.url})` }}
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-gray-700">{item.product_title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500">
                  Aucune image disponible. Uploadez une image pour commencer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
