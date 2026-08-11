'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import { useState, useEffect, useCallback } from 'react';
import { Settings, Palette, Globe, Truck, Save, CheckCircle, AlertCircle, Sparkles, ImageIcon, UploadCloud, X, Clock3, ShieldCheck, Link2, MapPin, Share2, Construction, AlertTriangle, Mail, Lock, RefreshCw, Trash2, Plus, Star, Copy } from 'lucide-react';
import { themes, type ThemeId, type ThemeCustomization } from '../../../../lib/themes';
import { ThemeCustomizer } from '../../../../components/dashboard/ThemeCustomizer';
import { AccountSecurityActivityPanel } from '../../../../components/AccountSecurityActivityPanel';
import { AccountTwoFactorPanel } from '../../../../components/AccountTwoFactorPanel';
import { LocaleSwitcher } from '../../../../components/LocaleSwitcher';
import { useLocale } from '../../../../contexts/LocaleContext';
import { getSellerTypeOptions, type SellerTypeValue } from '../../../../lib/seller-type';
import { fetchOnboardingState, updateOnboardingStep, type OnboardingState } from '../../../../lib/onboarding';
import { revalidateStoreCache } from '@/lib/store-cache';

type Tab = 'store' | 'security' | 'theme' | 'domain' | 'shipping' | 'emails' | 'payments';

const settingsTabIds: Tab[] = ['store', 'security', 'theme', 'domain', 'shipping', 'emails', 'payments'];

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

interface ApiTheme {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  is_free: boolean;
  is_premium: boolean;
  price: number;
  is_active: boolean;
}

async function getErrorMessage(res: Response, fallback = 'Error') {
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

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam && settingsTabIds.includes(tabParam as Tab)) {
      setActiveTab(tabParam as Tab);
    }
  }, []);

  // Store settings
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({});
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
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('classic');
  const [themeCustomization, setThemeCustomization] = useState<ThemeCustomization>({});
  const [apiThemes, setApiThemes] = useState<ApiTheme[]>([]);
  const [purchasedThemeIds, setPurchasedThemeIds] = useState<Set<string>>(new Set());
  const [purchaseConfirmTheme, setPurchaseConfirmTheme] = useState<ApiTheme | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Domain
  const [customDomain, setCustomDomain] = useState('');
  interface DomainItem {
    id: string;
    hostname: string;
    is_primary: boolean;
    verification_status: 'pending' | 'verified' | 'failed';
    ssl_status: 'pending' | 'issuing' | 'active' | 'failed';
    verification_token_hash?: string;
    created_at: string;
  }
  const [domainList, setDomainList] = useState<DomainItem[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [newDomainHostname, setNewDomainHostname] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);

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
        setSubdomain(store.subdomain || '');
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
        setSelectedTheme((store.theme_id || 'classic') as ThemeId);
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
        setError(await getErrorMessage(res, t('dashboardPages.settings.loadError')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.networkError'));
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

  // Fetch available themes and purchases from API
  useEffect(() => {
    let active = true;
    async function loadThemes() {
      try {
        const [themesRes, purchasesRes] = await Promise.all([
          fetchWithCsrf('/api/pd/themes', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/themes/purchases/mine', { credentials: 'include' }),
        ]);
        if (!active) return;
        if (themesRes.ok) {
          const data = await themesRes.json();
          setApiThemes(data.data || []);
        }
        if (purchasesRes.ok) {
          const data = await purchasesRes.json();
          const ids = new Set<string>((data.data || []).map((p: { theme_id: string }) => p.theme_id));
          setPurchasedThemeIds(ids);
        }
      } catch {
        // Non-critical — fallback to empty list
      }
    }
    loadThemes();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetchOnboardingState()
      .then((state) => {
        if (active) setOnboardingState(state);
      })
      .catch(() => {
        if (active) setOnboardingState({});
      });
    return () => {
      active = false;
    };
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

  const hasLogo = Boolean(logoUrl || logoLightUrl || logoDarkUrl);
  const hasCustomColors = Boolean(
    themeCustomization.colorPresetId || Object.values(themeCustomization.customColors || {}).some(Boolean),
  );
  const storeBasicsTasks = [
    { label: 'Nom', detail: 'Nom boutique sauvegardé', completed: storeName.trim().length > 0 },
    { label: 'Sous-domaine', detail: subdomain ? `${subdomain}.${marketplaceName.toLowerCase().replace(/\s+/g, '')}.tn` : 'Sous-domaine généré', completed: subdomain.trim().length > 0 },
    { label: 'Logos', detail: 'Logo principal, clair ou sombre', completed: hasLogo },
    { label: 'Couleurs', detail: 'Palette ou couleur personnalisée', completed: hasCustomColors },
  ];
  const completedStoreBasicsTasks = storeBasicsTasks.filter((task) => task.completed).length;
  const storeBasicsProgress = Math.round((completedStoreBasicsTasks / storeBasicsTasks.length) * 100);
  const storeBasicsComplete = completedStoreBasicsTasks === storeBasicsTasks.length;
  const storeBasicsPersisted = Boolean(onboardingState.store_basics?.completed);

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
        const nextOnboardingState = await updateOnboardingStep('store_basics', {
          completed: storeBasicsComplete,
          metadata: {
            store_name: storeName.trim(),
            subdomain,
            has_logo: hasLogo,
            has_custom_colors: hasCustomColors,
          },
        }).catch(() => null);
        if (nextOnboardingState) setOnboardingState(nextOnboardingState);
        if (sellerType === currentSellerType) {
          showFeedback(storeBasicsComplete ? 'Paramètres sauvegardés · étape Store basics complétée' : 'Paramètres sauvegardés');
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
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
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
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
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
        throw new Error(t('dashboardPages.settings.invalidImageFormat'));
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

      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, t('dashboardPages.settings.uploadFailed')));
      const presignData = await presignRes.json();
      const uploadUrl = presignData.upload_url as string | undefined;
      const publicUrl = presignData.public_url as string | undefined;
      if (!uploadUrl || !publicUrl) throw new Error('URL upload manquante');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(t('dashboardPages.settings.uploadFailed'));

      updateLogoTarget(target, publicUrl);
      await fetchMediaItems();
      showFeedback(t('dashboardPages.settings.logoSelected'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.settings.uploadFailed'), true);
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
        throw new Error(t('dashboardPages.settings.invalidImageFormat'));
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

      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, t('dashboardPages.settings.uploadFailed')));
      const presignData = await presignRes.json();
      const uploadUrl = presignData.upload_url as string | undefined;
      const publicUrl = presignData.public_url as string | undefined;
      if (!uploadUrl || !publicUrl) throw new Error('URL upload manquante');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(t('dashboardPages.settings.uploadFailed'));

      setMarketplaceHeaderImageUrl(publicUrl);
      await fetchMediaItems();
      showFeedback(t('dashboardPages.settings.coverSelected'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.settings.uploadFailed'), true);
    } finally {
      setUploadingHeaderImage(false);
    }
  };

  const saveTheme = async () => {
    // Block if premium theme is not purchased
    const apiTheme = apiThemes.find((t) => t.slug === selectedTheme);
    if (apiTheme && !apiTheme.is_free && !purchasedThemeIds.has(apiTheme.id)) {
      showFeedback('Ce thème premium n\'a pas été acheté. Veuillez l\'acheter avant de l\'appliquer.', true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme_id: selectedTheme }),
      });
      if (res.ok) {
        const themeName = apiTheme?.name || themes[selectedTheme]?.name || selectedTheme;
        const nextOnboardingState = await updateOnboardingStep('theme', {
          completed: true,
          metadata: {
            theme_id: selectedTheme,
            theme_name: themeName,
          },
        }).catch(() => null);
        if (nextOnboardingState) setOnboardingState(nextOnboardingState);
        showFeedback('Thème mis à jour · étape Theme complétée');
        // Invalidate storefront ISR cache so the new theme is visible immediately
        revalidateStoreCache({ subdomain, custom_domain: customDomain || null });
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    } finally {
      setSaving(false);
    }
  };

  const purchaseTheme = async (theme: ApiTheme) => {
    setPurchasing(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/themes/${theme.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setPurchasedThemeIds((prev) => new Set([...prev, theme.id]));
        setPurchaseConfirmTheme(null);
        showFeedback(`Thème « ${theme.name} » acheté avec succès !`);
      } else {
        showFeedback(await getErrorMessage(res, t('dashboardPages.settings.purchaseError')), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    } finally {
      setPurchasing(false);
    }
  };

  const saveThemeCustomization = async (customization: ThemeCustomization) => {
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
        const nextHasCustomColors = Boolean(
          customization.colorPresetId || Object.values(customization.customColors || {}).some(Boolean),
        );
        const nextStoreBasicsComplete = Boolean(storeName.trim() && subdomain.trim() && hasLogo && nextHasCustomColors);
        const nextStoreBasicsState = await updateOnboardingStep('store_basics', {
          completed: nextStoreBasicsComplete,
          metadata: {
            store_name: storeName.trim(),
            subdomain,
            has_logo: hasLogo,
            has_custom_colors: nextHasCustomColors,
          },
        }).catch(() => null);
        const apiThemeName = apiThemes.find((t) => t.slug === selectedTheme)?.name || themes[selectedTheme]?.name || selectedTheme;
        const nextThemeState = await updateOnboardingStep('theme', {
          completed: true,
          metadata: {
            theme_id: selectedTheme,
            theme_name: apiThemeName,
            color_preset_id: customization.colorPresetId || null,
            has_custom_colors: nextHasCustomColors,
            layout_variation: customization.layoutVariation || null,
            grid_density: customization.gridDensity || null,
            hero_style: customization.heroStyle || null,
          },
        }).catch(() => null);
        if (nextThemeState) {
          setOnboardingState(nextThemeState);
        } else if (nextStoreBasicsState) {
          setOnboardingState(nextStoreBasicsState);
        }
        showFeedback(nextStoreBasicsComplete ? 'Personnalisation sauvegardée · étapes Store basics et Theme mises à jour' : 'Personnalisation sauvegardée · étape Theme mise à jour');
        // Invalidate storefront ISR cache so customization changes are visible immediately
        revalidateStoreCache({ subdomain, custom_domain: customDomain || null });
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    }
  };

  const fetchDomains = useCallback(async () => {
    setLoadingDomains(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/domains', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDomainList(data.domains || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'domain') {
      fetchDomains();
    }
  }, [activeTab, fetchDomains]);

  const handleAddCustomDomain = async () => {
    if (!newDomainHostname.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hostname: newDomainHostname }),
      });
      if (res.ok) {
        showFeedback(t('dashboardPages.settings.domainAdded'));
        setNewDomainHostname('');
        fetchDomains();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (id: string) => {
    setVerifyingDomainId(id);
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/domains/${id}/verify`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.domain?.verification_status === 'verified') {
          showFeedback(t('dashboardPages.settings.domainVerified'));
        } else {
          showFeedback('Vérification DNS échouée. Assurez-vous que le CNAME ou TXT est bien propagé.', true);
        }
        fetchDomains();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleMakePrimaryDomain = async (id: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/domains/${id}/make-primary`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        showFeedback(t('dashboardPages.settings.domainPrimary'));
        fetchDomains();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) return;
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/domains/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        showFeedback(t('dashboardPages.settings.domainDeleted'));
        fetchDomains();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
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

      showFeedback(t('dashboardPages.settings.shippingPoliciesUpdated'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'store', label: t('dashboardPages.settings.storeTab'), icon: Settings },
    { id: 'security', label: t('dashboardPages.settings.securityTab'), icon: ShieldCheck },
    { id: 'theme', label: 'Thème', icon: Palette },
    { id: 'domain', label: t('dashboardPages.settings.domainTab'), icon: Globe },
    { id: 'shipping', label: t('dashboardPages.settings.shippingTab'), icon: Truck },
    { id: 'emails', label: 'Emails', icon: Mail },
  ];
  const hasPendingSellerTypeRequest = pendingSellerTypeRequest?.status === 'pending' && Boolean(pendingSellerTypeRequest.requested_type);
  const pendingSellerTypeLabel = hasPendingSellerTypeRequest
    ? sellerTypeOptions.find((option) => option.value === pendingSellerTypeRequest?.requested_type)?.label || pendingSellerTypeRequest?.requested_type
    : '';

  // Build theme list from API data (falls back to themes config if API hasn't loaded yet)
  const themeList: { id: ThemeId; name: string; desc: string; free: boolean; apiTheme?: ApiTheme }[] =
    apiThemes.length > 0
      ? apiThemes.map((t) => ({
          id: t.slug as ThemeId,
          name: t.name,
          desc: t.description || '',
          free: t.is_free,
          apiTheme: t,
        }))
      : Object.entries(themes).map(([slug, cfg]) => ({
          id: slug as ThemeId,
          name: cfg.name,
          desc: '',
          free: true, // Fallback: treat all as free when API unavailable
        }));

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
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wide text-[#B91C1C]">Étape d’onboarding</p>
                  <h3 className="mt-1 text-base font-black text-slate-950">Store basics: nom, sous-domaine, logos et couleurs</h3>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Complétez ces quatre éléments pour rendre votre vitrine reconnaissable avant de passer aux thèmes, produits et paiements.
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                    <div className="h-full rounded-full bg-[#B91C1C] transition-all" style={{ width: `${storeBasicsProgress}%` }} />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {storeBasicsTasks.map((task) => (
                      <div key={task.label} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
                        {task.completed ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900">{task.label}</p>
                          <p className="truncate text-[11px] font-semibold text-slate-500">{task.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-gray-400">Langue</span>
                    <LocaleSwitcher />
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-xs font-black ${storeBasicsPersisted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {storeBasicsPersisted ? 'Progression persistée' : `${completedStoreBasicsTasks}/${storeBasicsTasks.length} éléments`}
                  </div>
                  {!hasCustomColors && (
                    <button type="button" onClick={() => setActiveTab('theme')} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-50">
                      Configurer les couleurs
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Sous-domaine public</label>
                <input
                  type="text"
                  value={subdomain || 'Génération automatique'}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-600 outline-none"
                />
                <p className="mt-1 text-xs font-semibold text-gray-400">Le sous-domaine identifie votre storefront vendeur.</p>
              </div>
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
                          aria-label={`${storeName || t('dashboardPages.settings.storeLogo')} ${logo.label}`}
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
                          placeholder={t('dashboardPages.settings.maintenancePlaceholder')}
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
                                ? t('dashboardPages.settings.maintenanceSaved')
                                : enabling
                                  ? 'Mode maintenance activé'
                                  : t('dashboardPages.settings.storeBackOnline'),
                            );
                          } else {
                            showFeedback(await getErrorMessage(res), true);
                          }
                        } catch (err) {
                          showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
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
                            : t('dashboardPages.settings.saveMessage')
                          : t('dashboardPages.settings.enableMaintenance')}
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
              {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.save')}
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
              <p className="text-xs text-gray-500 mb-4">{themeList.length} thèmes disponibles. Les thèmes premium nécessitent un achat.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {themeList.map((t) => {
                  const cfg = themes[t.id];
                  const preset = cfg?.colorPresets[0];
                  const isPurchased = t.apiTheme ? purchasedThemeIds.has(t.apiTheme.id) : true;
                  const isLocked = !t.free && !isPurchased;
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
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                            <Lock className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{t.name}</h3>
                        {!t.free && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full flex-shrink-0 ${
                            isPurchased
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isPurchased ? 'ACHETÉ' : 'PREMIUM'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{t.desc}</p>
                      {isLocked && t.apiTheme && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPurchaseConfirmTheme(t.apiTheme!); }}
                          className="mt-1.5 w-full text-center px-2 py-1 text-[10px] font-bold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                        >
                          Acheter — {t.apiTheme.price} TND
                        </button>
                      )}
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
                {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.applyTheme')}
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
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-lg text-gray-900 mb-1">Domaines personnalisés</h2>
              <p className="text-sm text-gray-500">
                Connectez vos propres noms de domaine à votre boutique PandaMarket (plan Starter et supérieur).
              </p>
            </div>

            {/* Add New Domain Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Ajouter un nouveau domaine
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newDomainHostname}
                  onChange={(e) => setNewDomainHostname(e.target.value)}
                  placeholder="ex: boutique.com ou www.maboutique.tn"
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDomain}
                  disabled={addingDomain || !newDomainHostname.trim()}
                  className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingDomain ? t('dashboardPages.settings.addingDomain') : t('dashboardPages.settings.addDomain')}
                </button>
              </div>
            </div>

            {/* Existing Domains List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Vos domaines configurés</h3>
              {loadingDomains ? (
                <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" /> Chargement des domaines...
                </div>
              ) : domainList.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center space-y-2">
                  <Globe className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">Aucun domaine personnalisé configuré</p>
                  <p className="text-xs text-gray-400">Ajoutez votre domaine ci-dessus pour remplacer votre sous-domaine par défaut.</p>
                </div>
              ) : (
                domainList.map((d) => (
                  <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base text-gray-900">{d.hostname}</span>
                        {d.is_primary && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" /> Domaine Principal
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                            d.verification_status === 'verified'
                              ? 'bg-green-100 text-green-800'
                              : d.verification_status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {d.verification_status === 'verified'
                            ? '✓ Vérifié'
                            : d.verification_status === 'failed'
                              ? '✕ Vérification échouée'
                              : '⏳ En attente de vérification'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                            d.ssl_status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          SSL {d.ssl_status === 'active' ? 'Actif (HTTPS)' : 'En attente'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyDomain(d.id)}
                          disabled={verifyingDomainId === d.id}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomainId === d.id ? 'animate-spin' : ''}`} />
                          Vérifier DNS
                        </button>

                        {d.verification_status === 'verified' && !d.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleMakePrimaryDomain(d.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Définir comme principal
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteDomain(d.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* DNS Configuration Instructions */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                      <p className="font-bold text-slate-800">Instructions de configuration DNS chez votre registrar :</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-2.5 border rounded-md">
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">Enregistrement CNAME (Recommandé)</span>
                          <p className="mt-1 font-mono text-[11px] text-slate-900">
                            <strong>Nom/Hôte:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">@</code> ou <code className="bg-gray-100 px-1 py-0.5 rounded">www</code><br />
                            <strong>Cible:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">cname.garbage.team</code>
                          </p>
                        </div>
                        <div className="bg-white p-2.5 border rounded-md">
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">Challenge TXT (Alternative)</span>
                          <p className="mt-1 font-mono text-[11px] text-slate-900">
                            <strong>Nom TXT:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">_pandamarket-challenge.{d.hostname}</code><br />
                            <strong>Valeur TXT:</strong> Token unique généré
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
              {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.save')}
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
                        showFeedback(t('dashboardPages.settings.logoSelected'));
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
      {purchaseConfirmTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Acheter le thème premium</h2>
              <button
                type="button"
                onClick={() => setPurchaseConfirmTheme(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="my-6 space-y-3 text-sm text-gray-600">
              <p>
                Vous êtes sur le point d&apos;acheter le thème <strong className="text-gray-900">{purchaseConfirmTheme.name}</strong>.
              </p>
              {purchaseConfirmTheme.description && (
                <p className="text-xs text-gray-500">{purchaseConfirmTheme.description}</p>
              )}
              <div className="flex justify-between rounded-xl bg-amber-50 p-3 font-semibold text-amber-900">
                <span>Prix :</span>
                <span>{purchaseConfirmTheme.price} TND</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPurchaseConfirmTheme(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => purchaseTheme(purchaseConfirmTheme)}
                disabled={purchasing}
                className="rounded-xl bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#991B1B] disabled:opacity-50"
              >
                {purchasing ? t('dashboardPages.settings.purchasing') : t('dashboardPages.settings.confirmPurchase')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
