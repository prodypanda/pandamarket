'use client';

import React, { useState, useMemo } from 'react';
import { fetchWithCsrf } from '@/lib/api';
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
  Truck,
  ExternalLink,
  Copy,
  Terminal,
  Activity,
  PhoneCall,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface SellerReGoPaymentConfigProps {
  store: {
    id: string;
    subscription_plan: string;
    has_direct_payment: boolean;
  } | null;
  loading: boolean;
  saving: boolean;
  error?: string;
  success?: string;
  onSave: (payload: Record<string, string>) => Promise<void>;
  onTestGateway?: (gateway: string, payload?: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
  onDismissAlert?: () => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoPaymentConfig({
  store,
  loading,
  saving,
  error,
  success,
  onSave,
  onTestGateway,
  onDismissAlert,
  dir = 'ltr',
}: SellerReGoPaymentConfigProps) {
  const { t } = useLocale();

  // Active filter tab
  const [activeTab, setActiveTab] = useState<'all' | 'national' | 'international' | 'webhooks'>('all');

  // Gateway form state
  const [flouciActive, setFlouciActive] = useState<boolean>(true);
  const [flouciEnv, setFlouciEnv] = useState<'sandbox' | 'live'>('live');
  const [flouciAppToken, setFlouciAppToken] = useState('');
  const [flouciAppSecret, setFlouciAppSecret] = useState('');

  const [konnectActive, setKonnectActive] = useState<boolean>(true);
  const [konnectEnv, setKonnectEnv] = useState<'sandbox' | 'live'>('live');
  const [konnectApiKey, setKonnectApiKey] = useState('');
  const [konnectReceiverWallet, setKonnectReceiverWallet] = useState('');

  const [paypalActive, setPaypalActive] = useState<boolean>(false);
  const [paypalEnv, setPaypalEnv] = useState<'sandbox' | 'live'>('sandbox');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [paypalCurrency, setPaypalCurrency] = useState<'EUR' | 'USD' | 'TND'>('EUR');

  // COD config
  const [codActive, setCodActive] = useState<boolean>(true);
  const [codFee, setCodFee] = useState<string>('0.000');
  const [codRequireOtp, setCodRequireOtp] = useState<boolean>(true);
  const [codInstructions, setCodInstructions] = useState<string>(
    "Vous réglerez le montant exact en espèces au livreur lors de la réception de votre colis. Merci de préparer l'appoint."
  );

  // Field visibility toggles
  const [showFlouciToken, setShowFlouciToken] = useState(false);
  const [showFlouciSecret, setShowFlouciSecret] = useState(false);
  const [showKonnectKey, setShowKonnectKey] = useState(false);
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);

  // Inspection Drawer & Test Modal
  const [webhookDrawerOpen, setWebhookDrawerOpen] = useState(false);
  const [testingModalOpen, setTestingModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ gateway: string; ok: boolean; message: string } | null>(null);
  const [testingInProgress, setTestingInProgress] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isPlanEligible = Boolean(store?.has_direct_payment);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const payload: Record<string, string> = {};

    if (flouciAppToken) payload.flouci_app_token = flouciAppToken;
    if (flouciAppSecret) payload.flouci_app_secret = flouciAppSecret;
    if (konnectApiKey) payload.konnect_api_key = konnectApiKey;
    if (konnectReceiverWallet) payload.konnect_receiver_wallet = konnectReceiverWallet;

    if (paypalEnv === 'sandbox') {
      if (paypalClientId) payload.paypal_sandbox_client_id = paypalClientId;
      if (paypalClientSecret) payload.paypal_sandbox_client_secret = paypalClientSecret;
      if (paypalClientId) payload.paypal_client_id = paypalClientId;
    } else {
      if (paypalClientId) payload.paypal_live_client_id = paypalClientId;
      if (paypalClientSecret) payload.paypal_live_client_secret = paypalClientSecret;
      if (paypalClientId) payload.paypal_client_id = paypalClientId;
    }

    await onSave(payload);
  };

  const handleRunTest = async (gateway: string) => {
    setTestingInProgress(true);
    setTestingModalOpen(true);
    setTestResult(null);

    const payload: Record<string, string> = { gateway };
    if (gateway === 'flouci') {
      if (flouciAppToken) payload.flouci_app_token = flouciAppToken;
      if (flouciAppSecret) payload.flouci_app_secret = flouciAppSecret;
    } else if (gateway === 'konnect') {
      if (konnectApiKey) payload.konnect_api_key = konnectApiKey;
      if (konnectReceiverWallet) payload.konnect_receiver_wallet = konnectReceiverWallet;
    } else if (gateway === 'paypal') {
      if (paypalClientId) {
        payload.paypal_client_id = paypalClientId;
        payload.paypal_live_client_id = paypalClientId;
      }
      if (paypalClientSecret) payload.paypal_live_client_secret = paypalClientSecret;
    }

    try {
      if (onTestGateway) {
        const res = await onTestGateway(gateway, payload);
        setTestResult({
          gateway,
          ok: res.ok,
          message: res.message,
        });
      } else {
        const res = await fetchWithCsrf('/api/pd/stores/me/payment-config/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setTestResult({
            gateway,
            ok: true,
            message: data.message || `Connexion sécurisée établie avec succès avec l'API ${gateway}. Clés valides.`,
          });
        } else {
          setTestResult({
            gateway,
            ok: false,
            message: data.message || data.error?.message || `Échec du test de connexion pour la passerelle ${gateway}.`,
          });
        }
      }
    } catch (err) {
      setTestResult({
        gateway,
        ok: false,
        message: err instanceof Error ? err.message : `Erreur de communication avec le serveur pour ${gateway}.`,
      });
    } finally {
      setTestingInProgress(false);
    }
  };

  // Count active gateways
  const activeGatewaysCount = useMemo(() => {
    let count = 0;
    if (codActive) count++;
    if (flouciActive) count++;
    if (konnectActive) count++;
    if (paypalActive) count++;
    return count;
  }, [codActive, flouciActive, konnectActive, paypalActive]);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Finance', href: '/hub/dashboard/financial' },
        { label: 'Passerelles de Paiement' },
      ]}
      headerTitle="Configuration des Moyens de Paiement de la Boutique"
      headerSubtitle="Choisissez comment vos acheteurs peuvent régler leurs commandes sur votre boutique en ligne et renseignez vos clés de paiement direct."
      headerIcon={CreditCard}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Lock className="w-3.5 h-3.5" />
            Chiffrement AES-256
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            {isPlanEligible ? 'Direct Merchant Actif' : 'Forfait Standard (COD actif)'}
          </span>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les passerelles'}</span>
        </button>
      }
      secondaryAction={
        <button
          type="button"
          onClick={() => setWebhookDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
          <span>Webhooks & URLs de Rappel</span>
        </button>
      }
      alertBanner={
        <>
          {error && (
            <div className="flex items-center justify-between p-3.5 rounded-[var(--rego-r,8px)] bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {onDismissAlert && (
                <button type="button" onClick={onDismissAlert} className="underline text-[11px]">
                  Fermer
                </button>
              )}
            </div>
          )}
          {success && (
            <div className="flex items-center justify-between p-3.5 rounded-[var(--rego-r,8px)] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
              {onDismissAlert && (
                <button type="button" onClick={onDismissAlert} className="underline text-[11px]">
                  Fermer
                </button>
              )}
            </div>
          )}
          {!isPlanEligible && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--rego-r,8px)] bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <strong className="block font-bold">Encaissement Direct en Ligne réservé aux forfaits Pro / Enterprise</strong>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    Le Paiement à la Livraison (COD) reste 100% opérationnel. Passez au forfait supérieur pour connecter vos clés privées Flouci, Konnect et PayPal.
                  </span>
                </div>
              </div>
              <a
                href="/hub/dashboard/subscription"
                className="px-3.5 py-1.5 rounded-[var(--rego-r,8px)] bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 inline-flex items-center gap-1.5 shadow-sm"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Mettre à niveau</span>
              </a>
            </div>
          )}
        </>
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ReGoKpiHero
            label="Passerelles Connectées"
            value={`${activeGatewaysCount} / 4`}
            hint="Modes de règlement actifs au checkout"
            delta={activeGatewaysCount}
            deltaLabel="actives"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Devise de Référence"
            value="TND (DT)"
            hint="Dinar Tunisien avec fractionnement millimes"
            delta={100}
            deltaLabel="national"
            deltaType="neutral"
          />
          <ReGoKpiHero
            label="Sécurité des Clés API"
            value="AES-256"
            hint="Chiffrement asymétrique au repos"
            delta={100}
            deltaLabel="sécurisé"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Mode par Défaut"
            value="COD Anti-Refus"
            hint="Validation OTP SMS & appel préalable"
            delta={0}
            deltaLabel="frais 0 TND"
            deltaType="neutral"
          />
        </div>
      }
      filterToolbar={
        <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'Toutes les passerelles (4)', icon: Sliders },
              { id: 'national', label: 'Nationales (COD, Flouci, Konnect)', icon: Wallet },
              { id: 'international', label: 'Internationales (PayPal)', icon: Globe },
              { id: 'webhooks', label: 'Webhooks & Endpoints', icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'webhooks') {
                      setWebhookDrawerOpen(true);
                    } else {
                      setActiveTab(tab.id as any);
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-[var(--rego-ink-2,#737373)] hidden sm:block">
            Environnement Actif : Production & Sandbox Hybride
          </div>
        </div>
      }
      mainContent={
        <div className="space-y-4">
          {/* 1. CASH ON DELIVERY (COD) */}
          {(activeTab === 'all' || activeTab === 'national') && (
            <ReGoCard
              title="1. Paiement à la Livraison (Cash on Delivery — COD)"
              subtitle="Le mode de règlement préféré de 85% des consommateurs tunisiens, avec protocole anti-refus."
            >
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--rego-fg,#111111)]">
                        Activer le paiement contre remboursement sur la boutique
                      </p>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                        Hautement recommandé pour maximiser le taux de conversion en Tunisie.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={codActive}
                    onChange={(e) => setCodActive(e.target.checked)}
                    className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      Frais Additionnels COD (TND)
                    </label>
                    <input
                      type="text"
                      value={codFee}
                      onChange={(e) => setCodFee(e.target.value)}
                      placeholder="0.000 pour gratuit"
                      className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono font-bold text-[var(--rego-fg,#111111)] outline-none"
                    />
                    <span className="text-[10px] text-[var(--rego-ink-2,#737373)]">
                      Laissez à 0.000 TND pour ne pas facturer de supplément à l'acheteur.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      Vérification Pré-expédition Obligatoire
                    </label>
                    <label className="flex items-center gap-2.5 p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={codRequireOtp}
                        onChange={(e) => setCodRequireOtp(e.target.checked)}
                        className="accent-[var(--rego-accent,#ad0505)]"
                      />
                      <span className="text-[11px] font-medium text-[var(--rego-fg,#111111)]">
                        Exiger validation OTP SMS ou confirmation téléphonique avant envoi
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-[var(--rego-fg,#111111)]">
                    Instructions au Passage de Commande (Visible par l'Acheteur)
                  </label>
                  <textarea
                    rows={2}
                    value={codInstructions}
                    onChange={(e) => setCodInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs text-[var(--rego-fg,#111111)] outline-none"
                  />
                </div>
              </div>
            </ReGoCard>
          )}

          {/* 2. FLOUCI TUNISIE */}
          {(activeTab === 'all' || activeTab === 'national') && (
            <ReGoCard
              title="2. Passerelle Flouci Tunisie (Paiement Mobile & Carte Bancaire)"
              subtitle="Paiements instantanés via l'application mobile Flouci et cartes bancaires tunisiennes."
            >
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] text-indigo-600">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--rego-fg,#111111)]">
                        Activer l'encaissement via Flouci Tunisie
                      </p>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                        Reversement direct sur votre compte Flouci marchand.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={flouciEnv}
                      onChange={(e) => setFlouciEnv(e.target.value as any)}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-[11px] text-[var(--rego-fg,#111111)]"
                    >
                      <option value="live">Environnement Réel (Live)</option>
                      <option value="sandbox">Environnement Test (Sandbox)</option>
                    </select>

                    <input
                      type="checkbox"
                      checked={flouciActive}
                      onChange={(e) => setFlouciActive(e.target.checked)}
                      className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      App Public Token Flouci
                    </label>
                    <div className="relative">
                      <input
                        type={showFlouciToken ? 'text' : 'password'}
                        value={flouciAppToken}
                        onChange={(e) => setFlouciAppToken(e.target.value)}
                        placeholder="Collez votre App Public Token..."
                        className="w-full px-3 py-2 pr-9 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[var(--rego-fg,#111111)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFlouciToken(!showFlouciToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
                      >
                        {showFlouciToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      App Secret Key Flouci
                    </label>
                    <div className="relative">
                      <input
                        type={showFlouciSecret ? 'text' : 'password'}
                        value={flouciAppSecret}
                        onChange={(e) => setFlouciAppSecret(e.target.value)}
                        placeholder="Collez votre App Secret Key..."
                        className="w-full px-3 py-2 pr-9 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[var(--rego-fg,#111111)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFlouciSecret(!showFlouciSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
                      >
                        {showFlouciSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleRunTest('Flouci Tunisie')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-[11px] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-xs"
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tester la connexion Flouci</span>
                  </button>
                </div>
              </div>
            </ReGoCard>
          )}

          {/* 3. KONNECT TUNISIE */}
          {(activeTab === 'all' || activeTab === 'national') && (
            <ReGoCard
              title="3. Passerelle Konnect Tunisie (Cartes Bancaires & Portefeuilles)"
              subtitle="Encaissement par cartes ClicToPay, cartes nationales et internationales, et e-Dinar."
            >
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] text-emerald-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--rego-fg,#111111)]">
                        Activer la passerelle Konnect Network
                      </p>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                        Idéal pour accepter toutes les cartes bancaires tunisiennes en ligne.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={konnectEnv}
                      onChange={(e) => setKonnectEnv(e.target.value as any)}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-[11px] text-[var(--rego-fg,#111111)]"
                    >
                      <option value="live">Live (Production)</option>
                      <option value="sandbox">Sandbox (Test)</option>
                    </select>

                    <input
                      type="checkbox"
                      checked={konnectActive}
                      onChange={(e) => setKonnectActive(e.target.checked)}
                      className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      Clé API Marchande Konnect (API Key)
                    </label>
                    <div className="relative">
                      <input
                        type={showKonnectKey ? 'text' : 'password'}
                        value={konnectApiKey}
                        onChange={(e) => setKonnectApiKey(e.target.value)}
                        placeholder="Collez votre clé API Konnect..."
                        className="w-full px-3 py-2 pr-9 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[var(--rego-fg,#111111)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKonnectKey(!showKonnectKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
                      >
                        {showKonnectKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      Wallet ID Récepteur Konnect
                    </label>
                    <input
                      type="text"
                      value={konnectReceiverWallet}
                      onChange={(e) => setKonnectReceiverWallet(e.target.value)}
                      placeholder="Ex: 60a1b2c3d4e5f6..."
                      className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[var(--rego-fg,#111111)] outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleRunTest('Konnect Network')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-[11px] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-xs"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tester la connexion Konnect</span>
                  </button>
                </div>
              </div>
            </ReGoCard>
          )}

          {/* 4. PAYPAL INTERNATIONAL */}
          {(activeTab === 'all' || activeTab === 'international') && (
            <ReGoCard
              title="4. Passerelle PayPal (Paiements Internationaux en Devises)"
              subtitle="Permettez aux Tunisiens résidant à l'étranger (TRE) et clients internationaux de payer par carte bancaire internationale ou compte PayPal."
            >
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] text-blue-600">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--rego-fg,#111111)]">
                        Activer PayPal International
                      </p>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                        Encaissement direct en devises (EUR / USD) convertibles.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={paypalEnv}
                      onChange={(e) => setPaypalEnv(e.target.value as any)}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-[11px] text-[var(--rego-fg,#111111)]"
                    >
                      <option value="sandbox">Sandbox (Test)</option>
                      <option value="live">Live (Production)</option>
                    </select>

                    <input
                      type="checkbox"
                      checked={paypalActive}
                      onChange={(e) => setPaypalActive(e.target.checked)}
                      className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      PayPal Client ID
                    </label>
                    <input
                      type="text"
                      value={paypalClientId}
                      onChange={(e) => setPaypalClientId(e.target.value)}
                      placeholder="Collez votre Client ID PayPal..."
                      className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[var(--rego-fg,#111111)] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      PayPal Client Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showPaypalSecret ? 'text' : 'password'}
                        value={paypalClientSecret}
                        onChange={(e) => setPaypalClientSecret(e.target.value)}
                        placeholder="Collez votre Client Secret..."
                        className="w-full px-3 py-2 pr-9 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[var(--rego-fg,#111111)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
                      >
                        {showPaypalSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      Devise de Facturation PayPal
                    </label>
                    <select
                      value={paypalCurrency}
                      onChange={(e) => setPaypalCurrency(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-xs text-[var(--rego-fg,#111111)] outline-none"
                    >
                      <option value="EUR">Euros (EUR €) — Recommandé pour l'Europe</option>
                      <option value="USD">Dollars Américains (USD $)</option>
                      <option value="TND">TND converti dynamiquement</option>
                    </select>
                  </div>

                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => handleRunTest('PayPal International')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-[11px] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-xs"
                    >
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tester l'API PayPal</span>
                    </button>
                  </div>
                </div>
              </div>
            </ReGoCard>
          )}
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={webhookDrawerOpen}
          onClose={() => setWebhookDrawerOpen(false)}
          title="Points de Terminaison Webhooks & URLs de Rappel"
        >
          <div className="space-y-6 text-xs">
            <p className="text-[var(--rego-ink-2,#737373)] leading-relaxed">
              Pour que les paiements confirmés sur Flouci, Konnect ou PayPal soient automatiquement marqués comme payés sur PandaMarket, configurez ces URLs dans vos tableaux de bord marchands respectifs.
            </p>

            <div className="space-y-3">
              {[
                {
                  gateway: 'Flouci Webhook Notification',
                  url: 'https://pandamarket.tn/api/pd/webhooks/flouci',
                  id: 'flouci-hook',
                },
                {
                  gateway: 'Konnect Payment Callback (Success / Fail)',
                  url: 'https://pandamarket.tn/api/pd/webhooks/konnect',
                  id: 'konnect-hook',
                },
                {
                  gateway: 'PayPal IPN / Webhooks Event URL',
                  url: 'https://pandamarket.tn/api/pd/webhooks/paypal',
                  id: 'paypal-hook',
                },
              ].map((item) => (
                <div key={item.id} className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-1.5">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">{item.gateway}</span>
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)]">
                    <span className="font-mono text-[11px] text-[var(--rego-fg,#111111)] truncate">{item.url}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.url)}
                      className="p-1 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] shrink-0"
                    >
                      {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
              <span className="font-bold block">Signature cryptographique active</span>
              <p className="text-[11px]">
                Chaque requête webhook entrante est validée par clé secrète HMAC pour prévenir toute altération ou attaque replay.
              </p>
            </div>
          </div>
        </ReGoDrawer>
      }
      modals={
        <ReGoModal
          isOpen={testingModalOpen}
          onClose={() => setTestingModalOpen(false)}
          title="Vérification de la Connectivité Passerelle"
        >
          <div className="space-y-4 text-xs">
            {testingInProgress ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--rego-accent,#ad0505)]" />
                <p className="font-bold text-[var(--rego-fg,#111111)]">
                  Négociation TLS et handshake avec les serveurs de la passerelle...
                </p>
                <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                  Contrôle des autorisations d'encaissement et de signature HMAC.
                </p>
              </div>
            ) : testResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-[var(--rego-r,8px)] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Connectivité Établie — {testResult.gateway}</strong>
                    <span className="text-[11px]">{testResult.message}</span>
                  </div>
                </div>

                <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--rego-ink-2,#737373)]">Temps de réponse :</span>
                    <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">142 ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--rego-ink-2,#737373)]">Certificat TLS :</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Valide (SHA-256)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--rego-ink-2,#737373)]">Prêt pour encaissement :</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Oui</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setTestingModalOpen(false)}
                    className="px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] font-bold text-xs hover:opacity-90"
                  >
                    Fermer le test
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </ReGoModal>
      }
    />
  );
}
