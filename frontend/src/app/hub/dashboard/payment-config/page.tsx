'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  CreditCard,
  Save,
  AlertCircle,
  CheckCircle2,
  Lock,
  Crown,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  X,
  Zap,
  Globe,
  Wallet,
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
  const { t, dir } = useLocale();
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

  // Visibility toggles
  const [showFlouciToken, setShowFlouciToken] = useState(false);
  const [showFlouciSecret, setShowFlouciSecret] = useState(false);
  const [showKonnectKey, setShowKonnectKey] = useState(false);
  const [showPaypalSandboxSecret, setShowPaypalSandboxSecret] = useState(false);
  const [showPaypalLiveSecret, setShowPaypalLiveSecret] = useState(false);

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        setError(t('dashboardPages.paymentConfig.errorFillOneField') || 'Veuillez renseigner au moins une clé de passerelle.');
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
        setSuccess(t('dashboardPages.paymentConfig.savedSuccessfully') || 'Paramètres de passerelles enregistrés et chiffrés avec succès.');
        // Clear fields after save for security
        setFlouciAppToken('');
        setFlouciAppSecret('');
        setKonnectApiKey('');
        setKonnectReceiverWallet('');
        setPaypalSandboxClientId('');
        setPaypalSandboxClientSecret('');
        setPaypalLiveClientId('');
        setPaypalLiveClientSecret('');
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.paymentConfig.errorSaving') || 'Erreur lors de l\'enregistrement'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.paymentConfig.errorNetwork') || 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isPlanEligible) {
    return (
      <div dir={dir} className="space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('dashboardPages.paymentConfig.title') || 'Passerelles de Paiement Direct'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {t('dashboardPages.paymentConfig.subtitle') || 'Configurez vos comptes marchands Flouci, Konnect et PayPal.'}
              </p>
            </div>
          </div>
        </header>

        {/* Upgrade Plan Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center shadow-2xs max-w-2xl mx-auto space-y-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 w-12 h-12 flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-900/60 shadow-2xs">
            <Crown className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('dashboardPages.paymentConfig.proPlanRequiredTitle') || 'Fonctionnalité réservée au Forfait Supérieur'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-normal">
              {t('dashboardPages.paymentConfig.proPlanRequiredDesc') || 'L\'intégration de vos propres comptes marchands (Flouci, Konnect, PayPal) pour encaisser directement les fonds requiert un forfait actif avec option paiement direct.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-left text-xs text-slate-700 dark:text-slate-300 space-y-2 max-w-md mx-auto">
            <p className="font-semibold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">Avantages de l'encaissement direct :</p>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Paiements reversés instantanément sur vos portefeuilles marchands</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Support complet Flouci, Konnect (Cartes Bancaires) et PayPal</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Zéro commission additionnelle de rétention de fonds</span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <a
              href="/hub/dashboard/subscription"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{t('dashboardPages.paymentConfig.upgradePlan') || 'Mettre à niveau mon forfait'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <header className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('dashboardPages.paymentConfig.title') || 'Passerelles de Paiement Direct'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                  Direct Merchant
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {t('dashboardPages.paymentConfig.subtitle') || 'Renseignez vos clés API marchandes pour encaisser directement les ventes sur votre compte.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{saving ? (t('dashboardPages.paymentConfig.saving') || 'Enregistrement...') : (t('dashboardPages.paymentConfig.save') || 'Enregistrer les passerelles')}</span>
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-3 flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} aria-label="Fermer l'alerte" className="rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {success && (
          <div role="status" className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} aria-label="Fermer la confirmation" className="rounded-lg p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Security Notice */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 p-4 shadow-2xs flex items-start gap-3">
        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {t('dashboardPages.paymentConfig.encryptedAtRest') || 'Chiffrement Bancaire au Repos (AES-256)'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            {t('dashboardPages.paymentConfig.encryptedDesc') || 'Vos identifiants et clés d\'API sont chiffrés avec une clé asymétrique sécurisée. Pour des raisons de sécurité, ils ne sont jamais réaffichés en clair après enregistrement.'}
          </p>
        </div>
      </section>

      {/* Flouci Gateway */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
            <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
              {t('dashboardPages.paymentConfig.flouciTitle') || 'Flouci Tunisie (Paiement Mobile & Carte)'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              {t('dashboardPages.paymentConfig.flouciDesc') || 'Acceptez les paiements par portefeuille Flouci et cartes bancaires tunisiennes.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label htmlFor="flouci-app-token" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('dashboardPages.paymentConfig.flouciAppToken') || 'App Token Flouci'}
            </label>
            <div className="relative">
              <input
                id="flouci-app-token"
                type={showFlouciToken ? 'text' : 'password'}
                value={flouciAppToken}
                onChange={(e) => setFlouciAppToken(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.flouciAppTokenPlaceholder') || 'Collez votre App Token Flouci...'}
                className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowFlouciToken((v) => !v)}
                aria-label={showFlouciToken ? 'Masquer le token' : 'Afficher le token'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showFlouciToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="flouci-app-secret" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('dashboardPages.paymentConfig.flouciAppSecret') || 'App Secret Flouci'}
            </label>
            <div className="relative">
              <input
                id="flouci-app-secret"
                type={showFlouciSecret ? 'text' : 'password'}
                value={flouciAppSecret}
                onChange={(e) => setFlouciAppSecret(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.flouciAppSecretPlaceholder') || 'Collez votre App Secret Flouci...'}
                className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowFlouciSecret((v) => !v)}
                aria-label={showFlouciSecret ? 'Masquer le secret' : 'Afficher le secret'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showFlouciSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Konnect Gateway */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
              {t('dashboardPages.paymentConfig.konnectTitle') || 'Konnect Network (Cartes Bancaires & Portefeuilles)'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              {t('dashboardPages.paymentConfig.konnectDesc') || 'Encaissez par cartes ClicToPay, e-Dinar, et portefeuilles digitaux tunisiens.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label htmlFor="konnect-api-key" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('dashboardPages.paymentConfig.konnectApiKey') || 'Clé API Marchande Konnect'}
            </label>
            <div className="relative">
              <input
                id="konnect-api-key"
                type={showKonnectKey ? 'text' : 'password'}
                value={konnectApiKey}
                onChange={(e) => setKonnectApiKey(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.konnectApiKeyPlaceholder') || 'Collez votre Clé API Konnect...'}
                className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowKonnectKey((v) => !v)}
                aria-label={showKonnectKey ? 'Masquer la clé' : 'Afficher la clé'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showKonnectKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="konnect-wallet" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('dashboardPages.paymentConfig.konnectReceiverWallet') || 'Wallet ID Récepteur Konnect'}
            </label>
            <input
              id="konnect-wallet"
              type="text"
              value={konnectReceiverWallet}
              onChange={(e) => setKonnectReceiverWallet(e.target.value)}
              placeholder={t('dashboardPages.paymentConfig.konnectWalletPlaceholder') || 'Ex: 60a1b2c3d4e5f6...'}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
            />
          </div>
        </div>
      </section>

      {/* PayPal International Gateway */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
              {t('dashboardPages.paymentConfig.paypalTitle') || 'PayPal (Paiements Internationaux)'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              {t('dashboardPages.paymentConfig.paypalDesc') || 'Encaissez vos acheteurs internationaux en devises (EUR, USD) par PayPal et cartes bancaires.'}
            </p>
          </div>
        </div>

        {/* Sandbox */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {t('dashboardPages.paymentConfig.paypalSandboxSection') || 'Environnement de Test (Sandbox)'}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              Test
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="paypal-sandbox-client-id" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('dashboardPages.paymentConfig.paypalSandboxClientId') || 'Sandbox Client ID'}
              </label>
              <input
                id="paypal-sandbox-client-id"
                type="text"
                value={paypalSandboxClientId}
                onChange={(e) => setPaypalSandboxClientId(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.paypalSandboxClientIdPlaceholder') || 'Client ID Sandbox...'}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs font-mono text-slate-900 dark:text-white outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="paypal-sandbox-secret" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('dashboardPages.paymentConfig.paypalSandboxClientSecret') || 'Sandbox Client Secret'}
              </label>
              <div className="relative">
                <input
                  id="paypal-sandbox-secret"
                  type={showPaypalSandboxSecret ? 'text' : 'password'}
                  value={paypalSandboxClientSecret}
                  onChange={(e) => setPaypalSandboxClientSecret(e.target.value)}
                  placeholder={t('dashboardPages.paymentConfig.paypalSandboxClientSecretPlaceholder') || 'Client Secret Sandbox...'}
                  className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs font-mono text-slate-900 dark:text-white outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPaypalSandboxSecret((v) => !v)}
                  aria-label={showPaypalSandboxSecret ? 'Masquer le secret' : 'Afficher le secret'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPaypalSandboxSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {t('dashboardPages.paymentConfig.paypalLiveSection') || 'Environnement de Production (Live)'}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 font-mono">
              Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="paypal-live-client-id" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('dashboardPages.paymentConfig.paypalLiveClientId') || 'Live Client ID'}
              </label>
              <input
                id="paypal-live-client-id"
                type="text"
                value={paypalLiveClientId}
                onChange={(e) => setPaypalLiveClientId(e.target.value)}
                placeholder={t('dashboardPages.paymentConfig.paypalLiveClientIdPlaceholder') || 'Client ID Live...'}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs font-mono text-slate-900 dark:text-white outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="paypal-live-secret" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('dashboardPages.paymentConfig.paypalLiveClientSecret') || 'Live Client Secret'}
              </label>
              <div className="relative">
                <input
                  id="paypal-live-secret"
                  type={showPaypalLiveSecret ? 'text' : 'password'}
                  value={paypalLiveClientSecret}
                  onChange={(e) => setPaypalLiveClientSecret(e.target.value)}
                  placeholder={t('dashboardPages.paymentConfig.paypalLiveClientSecretPlaceholder') || 'Client Secret Live...'}
                  className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs font-mono text-slate-900 dark:text-white outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPaypalLiveSecret((v) => !v)}
                  aria-label={showPaypalLiveSecret ? 'Masquer le secret' : 'Afficher le secret'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPaypalLiveSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Save Action Footer */}
      <footer className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Les modifications prennent effet immédiatement après validation.
        </p>
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-5 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>{saving ? (t('dashboardPages.paymentConfig.saving') || 'Enregistrement...') : (t('dashboardPages.paymentConfig.save') || 'Enregistrer les paramètres')}</span>
        </button>
      </footer>
    </div>
  );
}
