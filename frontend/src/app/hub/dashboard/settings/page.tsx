'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import { useState, useEffect, useCallback } from 'react';
import { Settings, Palette, Globe, Truck, Save, CheckCircle, AlertCircle, Sparkles, ImageIcon, UploadCloud, X, Clock3, ShieldCheck, Link2, MapPin, Share2, Construction, AlertTriangle, Mail, Lock, RefreshCw, Trash2, Plus, Star, BarChart3 } from 'lucide-react';
import { themes, type ThemeId, type ThemeCustomization } from '../../../../lib/themes';
import { ThemeCustomizer } from '../../../../components/dashboard/ThemeCustomizer';
import { AccountSecurityActivityPanel } from '../../../../components/AccountSecurityActivityPanel';
import { AccountTwoFactorPanel } from '../../../../components/AccountTwoFactorPanel';
import { LocaleSwitcher } from '../../../../components/LocaleSwitcher';
import { useLocale } from '../../../../contexts/LocaleContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getSellerTypeOptions, type SellerTypeValue } from '../../../../lib/seller-type';
import { fetchOnboardingState, updateOnboardingStep, type OnboardingState } from '../../../../lib/onboarding';
import { revalidateStoreCache } from '@/lib/store-cache';
import {
  DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE,
  normalizeStorefrontProductLoadingMode,
} from '../../../../lib/storefront-product-loading';
import type { StorefrontProductLoadingMode } from '@pandamarket/types';

type Tab = 'store' | 'security' | 'theme' | 'domain' | 'shipping' | 'emails' | 'payments' | 'analytics';

const settingsTabIds: Tab[] = ['store', 'security', 'theme', 'domain', 'shipping', 'emails', 'payments', 'analytics'];

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
  const [storefrontProductLoadingMode, setStorefrontProductLoadingMode] = useState<StorefrontProductLoadingMode>(DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [logoPickerTarget, setLogoPickerTarget] = useState<'default' | 'light' | 'dark' | null>(null);
  const [showHeaderImagePicker, setShowHeaderImagePicker] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);

  // Analytics & Tracking Pixels
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [metaPixelId, setMetaPixelId] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');
  const [gtmContainerId, setGtmContainerId] = useState('');

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
  const [deleteDomainTargetId, setDeleteDomainTargetId] = useState<string | null>(null);
  const [deletingDomain, setDeletingDomain] = useState(false);

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
        setStorefrontProductLoadingMode(normalizeStorefrontProductLoadingMode(store.settings?.storefront_product_loading_mode));
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
        const analytics = store.settings?.analytics || {};
        setGa4MeasurementId(analytics.ga4_measurement_id || '');
        setMetaPixelId(analytics.meta_pixel_id || '');
        setTiktokPixelId(analytics.tiktok_pixel_id || '');
        setGtmContainerId(analytics.gtm_container_id || '');
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
            storefront_product_loading_mode: storefrontProductLoadingMode,
            analytics: {
              ga4_measurement_id: ga4MeasurementId.trim() || null,
              meta_pixel_id: metaPixelId.trim() || null,
              tiktok_pixel_id: tiktokPixelId.trim() || null,
              gtm_container_id: gtmContainerId.trim() || null,
            },
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

  const handleDeleteDomain = (id: string) => {
    setDeleteDomainTargetId(id);
  };

  const confirmDeleteDomain = async () => {
    if (!deleteDomainTargetId) return;
    const id = deleteDomainTargetId;
    setDeletingDomain(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/domains/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        showFeedback(t('dashboardPages.settings.domainDeleted'));
        setDeleteDomainTargetId(null);
        fetchDomains();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('common.networkError'), true);
    } finally {
      setDeletingDomain(false);
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
    { id: 'analytics', label: 'Analytics & Pixels', icon: BarChart3 },
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
      <div dir={dir} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Paramètres</h1>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-2xs">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded w-full" />
            <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={dir}>
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xs">
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Seller dashboard
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Paramètres</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Gérez votre identité boutique, vos visuels, votre thème, votre domaine et vos politiques publiques dans une interface claire.
          </p>
        </div>
      </div>

      {/* Feedback */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-sm font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm font-medium rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition flex-1 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        {/* Store Settings Tab */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informations de la boutique</h2>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Présentez votre boutique avec des informations propres, complètes et rassurantes.</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Étape d’onboarding</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">Store basics: nom, sous-domaine, logos et couleurs</h3>
                  <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    Complétez ces quatre éléments pour rendre votre vitrine reconnaissable avant de passer aux thèmes, produits et paiements.
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-slate-900 dark:bg-white transition-all" style={{ width: `${storeBasicsProgress}%` }} />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {storeBasicsTasks.map((task) => (
                      <div key={task.label} className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-3 py-2 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                        {task.completed ? <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{task.label}</p>
                          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{task.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-3 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Langue</span>
                    <LocaleSwitcher />
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-xs font-bold ${storeBasicsPersisted ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'}`}>
                    {storeBasicsPersisted ? 'Progression persistée' : `${completedStoreBasicsTasks}/${storeBasicsTasks.length} éléments`}
                  </div>
                  {!hasCustomColors && (
                    <button type="button" onClick={() => setActiveTab('theme')} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                      Configurer les couleurs
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom de la boutique</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sous-domaine public</label>
                <input
                  type="text"
                  value={subdomain || 'Génération automatique'}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-mono text-sm text-slate-600 dark:text-slate-300 outline-none"
                />
                <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">Le sous-domaine identifie votre storefront vendeur.</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none resize-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('sellerTypes.title')}</label>
              {hasPendingSellerTypeRequest && (
                <div className="mb-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-300">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">
                          {t('sellerTypes.approval.pendingRequest', { type: String(pendingSellerTypeLabel) })}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                          {t('sellerTypes.approval.pendingDetails')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                          <span className="rounded-full bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-900/40 px-3 py-1 text-amber-800 dark:text-amber-200">
                            {t('sellerTypes.approval.currentType')}: {sellerTypeOptions.find((option) => option.value === currentSellerType)?.label || currentSellerType}
                          </span>
                          <span className="rounded-full bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-900/40 px-3 py-1 text-amber-800 dark:text-amber-200">
                            {t('sellerTypes.approval.requestedType')}: {pendingSellerTypeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={cancelSellerTypeRequest}
                      disabled={cancellingSellerTypeRequest}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 transition hover:bg-amber-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancellingSellerTypeRequest ? t('sellerTypes.approval.cancelling') : t('sellerTypes.approval.cancelRequest')}
                    </button>
                  </div>
                </div>
              )}
              <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
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
                      className={`rounded-xl border p-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${isRtl ? 'text-right' : 'text-left'} ${
                        selected
                          ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 shadow-2xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-sm font-bold text-slate-900 dark:text-white">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email de contact</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <div className="mb-4 flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-slate-900 dark:text-white" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Adresse & carte</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ces informations apparaissent sur votre page vendeur et dans le pied de page de votre boutique.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pays</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL Google Maps embed</label>
                  <input
                    type="url"
                    value={mapEmbedUrl}
                    onChange={(event) => setMapEmbedUrl(event.target.value)}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white rounded-xl focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Utilisez uniquement une URL d&apos;intégration Google Maps.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <div className="mb-4 flex items-start gap-3">
                <Share2 className="mt-0.5 h-5 w-5 text-slate-900 dark:text-white" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Réseaux sociaux</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ajoutez vos profils publics pour rassurer les clients et générer du trafic.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {socialPlatforms.map((platform) => (
                  <div key={platform.key}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{platform.label}</label>
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="url"
                        value={socialLinks[platform.key]}
                        onChange={(event) => updateSocialLink(platform.key, event.target.value)}
                        placeholder={platform.placeholder}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white py-2.5 pl-10 pr-4 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Logos de la boutique</label>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Le logo sombre est utilisé sur fond clair. Le logo clair est utilisé sur fond sombre. Le logo principal reste le fallback.</p>
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  { key: 'default' as const, label: 'Logo principal', value: logoUrl, setter: setLogoUrl, previewClass: 'bg-white' },
                  { key: 'dark' as const, label: 'Logo sombre', value: logoDarkUrl, setter: setLogoDarkUrl, previewClass: 'bg-white' },
                  { key: 'light' as const, label: 'Logo clair', value: logoLightUrl, setter: setLogoLightUrl, previewClass: 'bg-slate-950' },
                ].map((logo) => (
                  <div key={logo.key} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
                    <div className={`flex h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 ${logo.previewClass}`}>
                      {logo.value ? (
                        <div
                          aria-label={`${storeName || t('dashboardPages.settings.storeLogo')} ${logo.label}`}
                          role="img"
                          className="h-full w-full bg-contain bg-center bg-no-repeat"
                          style={{ backgroundImage: `url(${getResizedImageUrl(logo.value, 'large')})` }}
                        />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{logo.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{logo.value ? 'Image sélectionnée' : 'Aucune image'}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {logo.value && (
                        <button
                          type="button"
                          onClick={() => logo.setter('')}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Galerie
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-white shadow-2xs transition">
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
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Image d&apos;en-tête marketplace</label>
              <div className="space-y-4">
                <div className="h-40 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {marketplaceHeaderImageUrl ? (
                    <div
                      aria-label="Image d'en-tête marketplace"
                      role="img"
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${getResizedImageUrl(marketplaceHeaderImageUrl, 'large')})` }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{marketplaceHeaderImageUrl ? 'Image sélectionnée' : 'Aucune image'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cette image apparaît comme couverture sur votre page vendeur dans la marketplace.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {marketplaceHeaderImageUrl && (
                      <button
                        type="button"
                        onClick={() => setMarketplaceHeaderImageUrl('')}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Galerie
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-sm font-semibold text-white shadow-2xs transition">
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

            <fieldset className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
              <legend className="px-1 text-sm font-bold text-slate-900 dark:text-white">Navigation du catalogue produits</legend>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                Choisissez la façon dont les visiteurs parcourent les produits au-delà des 24 premiers articles. Le réglage s’applique à la page d’accueil de votre vitrine.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3" role="radiogroup" aria-label="Mode de chargement des produits">
                {([
                  {
                    value: 'pagination' as const,
                    title: 'Pagination simple',
                    description: 'Pages numérotées, partageables et faciles à retrouver.',
                  },
                  {
                    value: 'load_more' as const,
                    title: 'Bouton « Charger plus »',
                    description: 'Les produits déjà consultés restent visibles et le visiteur contrôle le rythme.',
                  },
                  {
                    value: 'infinite' as const,
                    title: 'Chargement au défilement',
                    description: 'Les produits suivants se chargent automatiquement près de la fin de la grille.',
                  },
                ]).map((option) => {
                  const selected = storefrontProductLoadingMode === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition ${
                        selected
                          ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 shadow-2xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="storefront-product-loading-mode"
                        value={option.value}
                        checked={selected}
                        onChange={() => setStorefrontProductLoadingMode(option.value)}
                        className="sr-only"
                      />
                      <span className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-600'}`}
                        >
                          {selected && <span className="h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-white" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-slate-900 dark:text-white">{option.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{option.description}</span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Recommandé : « Bouton Charger plus » pour un bon équilibre entre performance, contrôle et accessibilité.
              </p>
            </fieldset>

            {/* Maintenance Mode Toggle */}
            {(storeStatus === 'verified' || storeStatus === 'maintenance') && (
              <div className={`rounded-2xl border p-4 ${storeStatus === 'maintenance' ? 'border-amber-300/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30' : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'}`}>
                <div className="flex items-start gap-3">
                  <Construction className={`mt-0.5 h-5 w-5 ${storeStatus === 'maintenance' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Mode maintenance</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {storeStatus === 'maintenance'
                        ? storeIsVerified
                          ? 'Votre boutique est actuellement en maintenance et inaccessible aux visiteurs.'
                          : 'Votre boutique restera en maintenance jusqu’à votre vérification et sa publication.'
                        : 'Activez le mode maintenance pour rendre votre boutique temporairement inaccessible.'}
                    </p>
                    {storeStatus === 'maintenance' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Message de maintenance</label>
                        <textarea
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                          placeholder={t('dashboardPages.settings.maintenancePlaceholder')}
                          rows={2}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
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
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                        storeStatus === 'maintenance' && storeIsVerified
                          ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-2xs'
                          : 'border border-amber-300/80 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-slate-700'
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
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.save')}
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <AccountTwoFactorPanel accentClass="bg-slate-900 dark:bg-white" />
            <AccountSecurityActivityPanel accentClass="bg-slate-900 dark:bg-white" compact />
          </div>
        )}

        {/* Theme Tab */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            {/* Theme Selector */}
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white mb-1">Choisir un thème</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{themeList.length} thèmes disponibles. Les thèmes premium nécessitent un achat.</p>
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
                      className={`p-3 rounded-2xl border-2 text-left transition ${
                        selectedTheme === t.id
                          ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 shadow-2xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Mini color preview */}
                      <div className="h-16 rounded-xl mb-2 overflow-hidden relative" style={{ backgroundColor: preset?.background || '#F3F4F6' }}>
                        <div className="absolute top-0 left-0 right-0 h-5" style={{ backgroundColor: preset?.headerBg || '#FFFFFF' }} />
                        <div className="absolute bottom-0 left-0 right-0 h-4" style={{ backgroundColor: preset?.footerBg || '#1A1A2E' }} />
                        <div className="absolute top-6 left-2 flex gap-1">
                          {preset && [preset.primary, preset.accent, preset.secondary].map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                            <Lock className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{t.name}</h3>
                        {!t.free && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full flex-shrink-0 ${
                            isPurchased
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}>
                            {isPurchased ? 'ACHETÉ' : 'PREMIUM'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{t.desc}</p>
                      {isLocked && t.apiTheme && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPurchaseConfirmTheme(t.apiTheme!); }}
                          className="mt-1.5 w-full text-center px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition"
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
                className="flex items-center gap-2 px-6 py-2.5 mt-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.applyTheme')}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200/80 dark:border-slate-800" />

            {/* Theme Customizer */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-slate-900 dark:text-white" />
                <h2 className="font-bold text-slate-900 dark:text-white">Personnalisation avancée</h2>
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
              <h2 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Domaines personnalisés</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Connectez vos propres noms de domaine à votre boutique PandaMarket (plan Starter et supérieur).
              </p>
            </div>

            {/* Add New Domain Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Ajouter un nouveau domaine
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newDomainHostname}
                  onChange={(e) => setNewDomainHostname(e.target.value)}
                  placeholder="ex: boutique.com ou www.maboutique.tn"
                  className="flex-1 px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDomain}
                  disabled={addingDomain || !newDomainHostname.trim()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-sm font-medium rounded-xl shadow-2xs transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingDomain ? t('dashboardPages.settings.addingDomain') : t('dashboardPages.settings.addDomain')}
                </button>
              </div>
            </div>

            {/* Existing Domains List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vos domaines configurés</h3>
              {loadingDomains ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" /> Chargement des domaines...
                </div>
              ) : domainList.length === 0 ? (
                <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200/80 dark:border-slate-700 rounded-2xl p-8 text-center space-y-2">
                  <Globe className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Aucun domaine personnalisé configuré</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Ajoutez votre domaine ci-dessus pour remplacer votre sous-domaine par défaut.</p>
                </div>
              ) : (
                domainList.map((d) => (
                  <div key={d.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base text-slate-900 dark:text-white">{d.hostname}</span>
                        {d.is_primary && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400" /> Domaine Principal
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                            d.verification_status === 'verified'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : d.verification_status === 'failed'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
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
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomainId === d.id ? 'animate-spin' : ''}`} />
                          Vérifier DNS
                        </button>

                        {d.verification_status === 'verified' && !d.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleMakePrimaryDomain(d.id)}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl transition"
                          >
                            Définir comme principal
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteDomain(d.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* DNS Configuration Instructions */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-xs space-y-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Instructions de configuration DNS chez votre registrar :</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-850 p-2.5 border border-slate-200/80 dark:border-slate-700 rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Enregistrement CNAME (Recommandé)</span>
                          <p className="mt-1 font-mono text-[11px] text-slate-900 dark:text-white">
                            <strong>Nom/Hôte:</strong> <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">@</code> ou <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">www</code><br />
                            <strong>Cible:</strong> <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">cname.garbage.team</code>
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-850 p-2.5 border border-slate-200/80 dark:border-slate-700 rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Challenge TXT (Alternative)</span>
                          <p className="mt-1 font-mono text-[11px] text-slate-900 dark:text-white">
                            <strong>Nom TXT:</strong> <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">_pandamarket-challenge.{d.hostname}</code><br />
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
            <h2 className="font-bold text-slate-900 dark:text-white mb-4">Mode de livraison</h2>
            <div className="space-y-3">
              {[
                { id: 'self_managed', name: 'Gestion vendeur', desc: 'Vous gérez vous-même la livraison et le suivi client.' },
                { id: 'platform_unified', name: 'Plateforme unifiée', desc: `Utilise les intégrations ${marketplaceName} pour les bordereaux et le suivi.` },
              ].map((mode) => (
                <label
                  key={mode.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                    shippingMode === mode.id
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 shadow-2xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping_mode"
                    checked={shippingMode === mode.id}
                    onChange={() => setShippingMode(mode.id)}
                    className="accent-slate-900 dark:accent-white"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{mode.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Politiques publiques</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Ces textes peuvent être affichés dans les blocs dynamiques Page Builder. Ne saisissez pas de clés API ou d&apos;informations privées.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Politique de livraison</label>
                  <textarea
                    value={shippingPolicy}
                    onChange={(event) => setShippingPolicy(event.target.value)}
                    rows={4}
                    placeholder="Délais estimés, zones desservies, suivi, frais ou conditions spécifiques..."
                    className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white px-4 py-2.5 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Retours & échanges</label>
                  <textarea
                    value={returnsPolicy}
                    onChange={(event) => setReturnsPolicy(event.target.value)}
                    rows={4}
                    placeholder="Conditions de retour, délais, produits exclus, procédure de contact..."
                    className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white px-4 py-2.5 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Information paiement publique</label>
                  <textarea
                    value={paymentPolicy}
                    onChange={(event) => setPaymentPolicy(event.target.value)}
                    rows={4}
                    placeholder="Modes acceptés, paiement à la livraison, Mandat Minute ou consignes publiques..."
                    className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white px-4 py-2.5 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={saveShipping}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.save')}
            </button>
          </div>
        )}

        {/* Analytics & Tracking Pixels Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Analytics & Pixels de Suivi
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configurez vos identifiants Google Analytics 4, Meta Pixel, Google Tag Manager et TikTok Pixel pour suivre les conversions et optimiser vos campagnes publicitaires sur votre boutique.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Google Analytics 4 */}
              <div className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 dark:text-white">Google Analytics 4 (GA4)</label>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold rounded-full">Mesure</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Identifiant de mesure commençant par <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">G-</code> pour suivre les pages vues, le panier et les commandes.
                </p>
                <input
                  type="text"
                  value={ga4MeasurementId}
                  onChange={(e) => setGa4MeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white bg-white dark:bg-slate-850 text-slate-900 dark:text-white outline-none transition"
                />
              </div>

              {/* Meta Pixel (Facebook / Instagram) */}
              <div className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 dark:text-white">Meta Pixel (Facebook / IG)</label>
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold rounded-full">Ads & Retargeting</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Identifiant numérique Meta Pixel (15-16 chiffres) pour suivre les événements <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">AddToCart</code> et <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">Purchase</code>.
                </p>
                <input
                  type="text"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                  placeholder="123456789012345"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white bg-white dark:bg-slate-850 text-slate-900 dark:text-white outline-none transition"
                />
              </div>

              {/* Google Tag Manager (GTM) */}
              <div className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 dark:text-white">Google Tag Manager (GTM)</label>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold rounded-full">Conteneur</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Identifiant conteneur commençant par <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">GTM-</code> pour gérer vos balises personnalisées.
                </p>
                <input
                  type="text"
                  value={gtmContainerId}
                  onChange={(e) => setGtmContainerId(e.target.value)}
                  placeholder="GTM-XXXXXXX"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white bg-white dark:bg-slate-850 text-slate-900 dark:text-white outline-none transition"
                />
              </div>

              {/* TikTok Pixel */}
              <div className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 dark:text-white">TikTok Pixel</label>
                  <span className="text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-semibold rounded-full">TikTok Ads</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Identifiant TikTok Pixel pour mesurer le rendement de vos campagnes TikTok et le trafic vers votre boutique.
                </p>
                <input
                  type="text"
                  value={tiktokPixelId}
                  onChange={(e) => setTiktokPixelId(e.target.value)}
                  placeholder="CXXXXXXXXXXXXXX"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white bg-white dark:bg-slate-850 text-slate-900 dark:text-white outline-none transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={saveStoreSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? t('dashboardPages.settings.saving') : 'Sauvegarder les pixels & analytics'}
              </button>
            </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Galerie de la boutique</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choisissez une image déjà uploadée pour votre logo.</p>
              </div>
              <button type="button" onClick={() => setLogoPickerTarget(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition">
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
                      className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-left transition hover:border-slate-900 dark:hover:border-white hover:shadow-2xs"
                    >
                      <div className="aspect-square bg-slate-100 dark:bg-slate-800">
                        <div
                          aria-label={item.alt_text || item.product_title}
                          role="img"
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${getResizedImageUrl(item.url, 'large')})` }}
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{item.product_title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucune image disponible. Uploadez un logo pour commencer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showHeaderImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Galerie de la boutique</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choisissez une image pour l&apos;en-tête marketplace.</p>
              </div>
              <button type="button" onClick={() => setShowHeaderImagePicker(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition">
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
                      className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-left transition hover:border-slate-900 dark:hover:border-white hover:shadow-2xs"
                    >
                      <div className="aspect-square bg-slate-100 dark:bg-slate-800">
                        <div
                          aria-label={item.alt_text || item.product_title}
                          role="img"
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${getResizedImageUrl(item.url, 'large')})` }}
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{item.product_title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucune image disponible. Uploadez une image pour commencer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {purchaseConfirmTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acheter le thème premium</h2>
              <button
                type="button"
                onClick={() => setPurchaseConfirmTheme(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="my-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                Vous êtes sur le point d&apos;acheter le thème <strong className="text-slate-900 dark:text-white">{purchaseConfirmTheme.name}</strong>.
              </p>
              {purchaseConfirmTheme.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{purchaseConfirmTheme.description}</p>
              )}
              <div className="flex justify-between rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 p-3 font-semibold text-amber-900 dark:text-amber-200">
                <span>Prix :</span>
                <span>{purchaseConfirmTheme.price} TND</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPurchaseConfirmTheme(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => purchaseTheme(purchaseConfirmTheme)}
                disabled={purchasing}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-xs font-medium text-white shadow-2xs transition disabled:opacity-50"
              >
                {purchasing ? t('dashboardPages.settings.purchasing') : t('dashboardPages.settings.confirmPurchase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDomainTargetId && (
        <ConfirmDialog
          isOpen={!!deleteDomainTargetId}
          onClose={() => {
            if (!deletingDomain) setDeleteDomainTargetId(null);
          }}
          onConfirm={confirmDeleteDomain}
          title={t('dashboardPages.settings.deleteDomainTitle') || "Supprimer le domaine"}
          description={
            <div className="space-y-2">
              <p>
                {t('dashboardPages.settings.confirmDeleteDomain') || "Êtes-vous sûr de vouloir supprimer ce domaine ?"}
              </p>
              {(() => {
                const targetDomain = domainList.find((d) => d.id === deleteDomainTargetId);
                return targetDomain ? (
                  <p className="font-semibold text-slate-900 dark:text-white font-mono text-sm">
                    {targetDomain.hostname}
                  </p>
                ) : null;
              })()}
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Le trafic vers ce domaine personnalisé ne sera plus dirigé vers votre boutique.
              </p>
            </div>
          }
          confirmLabel={t('dashboardPages.common.delete') || "Supprimer"}
          cancelLabel={t('dashboardPages.common.cancel') || "Annuler"}
          variant="danger"
          loading={deletingDomain}
          dir={dir}
        />
      )}
    </div>
  );
}
