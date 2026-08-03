'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  CreditCard,
  Save,
  AlertCircle,
  CheckCircle,
  Lock,
  Crown,
  Loader2,
} from 'lucide-react';

interface StoreInfo {
  id: string;
  subscription_plan: string;
  has_direct_payment: boolean;
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export default function PaymentConfigPage() {
  const { t, locale } = useLocale();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment config fields
  const [flouciAppToken, setFlouciAppToken] = useState('');
  const [flouciAppSecret, setFlouciAppSecret] = useState('');
  const [konnectApiKey, setKonnectApiKey] = useState('');
  const [konnectReceiverWallet, setKonnectReceiverWallet] = useState('');
  const [paypalSandboxClientId, setPaypalSandboxClientId] = useState('');
  const [paypalSandboxClientSecret, setPaypalSandboxClientSecret] = useState('');
  const [paypalLiveClientId, setPaypalLiveClientId] = useState('');
  const [paypalLiveClientSecret, setPaypalLiveClientSecret] = useState('');

  useEffect(() => {
    async function fetchStore() {
      try {
        const [storeRes, subscriptionRes] = await Promise.all([
          fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/subscriptions/current', { credentials: 'include' }),
        ]);
        if (storeRes.ok) {
          const data = await storeRes.json();
          const subscriptionData = subscriptionRes.ok ? await subscriptionRes.json() : null;
          setStore({
            id: data.store?.id || '',
            subscription_plan: data.store?.subscription_plan || 'free',
            has_direct_payment: Boolean(subscriptionData?.limits?.has_direct_payment),
          });
        } else {
          setError(await getErrorMessage(storeRes, t('dashboardPages.paymentConfig.errorLoadingStore')));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('dashboardPages.paymentConfig.errorNetwork'));
      }
      setLoading(false);
    }
    fetchStore();
  }, [t]);

  const isPlanEligible = Boolean(store?.has_direct_payment);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const body: Record<string, string> = {};
      if (flouciAppToken) body.flouci_app_token = flouciAppToken;
      if (flouciAppSecret) body.flouci_app_secret = flouciAppSecret;
      if (konnectApiKey) body.konnect_api_key = konnectApiKey;
      if (konnectReceiverWallet) body.konnect_receiver_wallet = konnectReceiverWallet;
      if (paypalSandboxClientId) body.paypal_sandbox_client_id = paypalSandboxClientId;
      if (paypalSandboxClientSecret) body.paypal_sandbox_client_secret = paypalSandboxClientSecret;
      if (paypalLiveClientId) body.paypal_live_client_id = paypalLiveClientId;
      if (paypalLiveClientSecret) body.paypal_live_client_secret = paypalLiveClientSecret;
      if (paypalSandboxClientId || paypalLiveClientId) body.paypal_client_id = paypalLiveClientId || paypalSandboxClientId;

      if (Object.keys(body).length === 0) {
        setError(t('dashboardPages.paymentConfig.errorFillOneField'));
        setSaving(false);
        return;
      }

      const res = await fetchWithCsrf('/api/pd/stores/me/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(t('dashboardPages.paymentConfig.savedSuccessfully'));
        // Clear fields after save (they're encrypted on the server)
        setFlouciAppToken('');
        setFlouciAppSecret('');
        setKonnectApiKey('');
        setKonnectReceiverWallet('');
        setPaypalSandboxClientId('');
        setPaypalSandboxClientSecret('');
        setPaypalLiveClientId('');
        setPaypalLiveClientSecret('');
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.paymentConfig.errorSaving')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.paymentConfig.errorNetwork'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboardPages.paymentConfig.title')}</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isPlanEligible) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboardPages.paymentConfig.title')}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('dashboardPages.paymentConfig.proPlanRequiredTitle')}</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {t('dashboardPages.paymentConfig.proPlanRequiredDesc')}
          </p>
          <a
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors"
          >
            <Crown className="w-4 h-4" />
            {t('dashboardPages.paymentConfig.upgradePlan')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboardPages.paymentConfig.title')}</h1>
        <p className="text-gray-500 mt-1">
          {t('dashboardPages.paymentConfig.subtitle')}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">{t('dashboardPages.paymentConfig.encryptedAtRest')}</p>
          <p className="text-sm text-blue-700">
            {t('dashboardPages.paymentConfig.encryptedDesc')}
          </p>
        </div>
      </div>

      {/* Flouci Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t('dashboardPages.paymentConfig.flouciTitle')}</h2>
            <p className="text-sm text-gray-500">{t('dashboardPages.paymentConfig.flouciDesc')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.flouciAppToken')}</label>
            <input
              type="password"
              value={flouciAppToken}
              onChange={(e) => setFlouciAppToken(e.target.value)}
              placeholder={t('dashboardPages.paymentConfig.flouciAppTokenPlaceholder')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.flouciAppSecret')}</label>
            <input
              type="password"
              value={flouciAppSecret}
              onChange={(e) => setFlouciAppSecret(e.target.value)}
              placeholder={t('dashboardPages.paymentConfig.flouciAppSecretPlaceholder')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Konnect Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t('dashboardPages.paymentConfig.konnectTitle')}</h2>
            <p className="text-sm text-gray-500">{t('dashboardPages.paymentConfig.konnectDesc')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.konnectApiKey')}</label>
            <input
              type="password"
              value={konnectApiKey}
              onChange={(e) => setKonnectApiKey(e.target.value)}
              placeholder={t('dashboardPages.paymentConfig.konnectApiKeyPlaceholder')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.konnectReceiverWallet')}</label>
            <input
              type="text"
              value={konnectReceiverWallet}
              onChange={(e) => setKonnectReceiverWallet(e.target.value)}
              placeholder={t('dashboardPages.paymentConfig.konnectWalletPlaceholder')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
            />
          </div>
        </div>
      </div>

      {/* PayPal Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t('dashboardPages.paymentConfig.paypalTitle')}</h2>
            <p className="text-sm text-gray-500">{t('dashboardPages.paymentConfig.paypalDesc')}</p>
          </div>
        </div>

        {/* Sandbox */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">{t('dashboardPages.paymentConfig.paypalSandboxSection')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.paypalSandboxClientId')}</label>
              <input
                type="password"
                value={paypalSandboxClientId}
                onChange={(e) => setPaypalSandboxClientId(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.paypalSandboxClientIdPlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.paypalSandboxClientSecret')}</label>
              <input
                type="password"
                value={paypalSandboxClientSecret}
                onChange={(e) => setPaypalSandboxClientSecret(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.paypalSandboxClientSecretPlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Live */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">{t('dashboardPages.paymentConfig.paypalLiveSection')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.paypalLiveClientId')}</label>
              <input
                type="password"
                value={paypalLiveClientId}
                onChange={(e) => setPaypalLiveClientId(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.paypalLiveClientIdPlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('dashboardPages.paymentConfig.paypalLiveClientSecret')}</label>
              <input
                type="password"
                value={paypalLiveClientSecret}
                onChange={(e) => setPaypalLiveClientSecret(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.paypalLiveClientSecretPlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? t('dashboardPages.paymentConfig.saving') : t('dashboardPages.paymentConfig.save')}
        </button>
      </div>
    </div>
  );
}
