'use client';

import React from 'react';
import {
  Mail,
  Save,
  RotateCcw,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Server,
  AlertTriangle,
  Zap,
  Globe,
  Lock,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface SmtpFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
  email_transport: 'smtp' | 'brevo_api';
  brevo_api_key: string;
}

export type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export interface AdminReGoSmtpProps {
  form: SmtpFormData;
  existingPassSet: boolean;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  showPassword: boolean;
  testStatus: TestStatus;
  testMessage: string;
  testEmail: string;
  selectedPreset: string;
  brevoApiKeySet: boolean;
  error: string;
  updateField: (field: keyof SmtpFormData, value: any) => void;
  applyPreset: (key: string) => void;
  saveConfig: () => void;
  runTest: () => void;
  setShowPassword: (show: boolean) => void;
  setTestEmail: (email: string) => void;
  providerPresets: Record<string, { host: string; port: number; secure: boolean; label: string }>;
}

export function AdminReGoSmtp({
  form,
  existingPassSet,
  loading,
  saving,
  saved,
  showPassword,
  testStatus,
  testMessage,
  testEmail,
  selectedPreset,
  brevoApiKeySet,
  error,
  updateField,
  applyPreset,
  saveConfig,
  runTest,
  setShowPassword,
  setTestEmail,
  providerPresets,
}: AdminReGoSmtpProps) {
  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Gouvernance', href: '/settings' },
        { label: 'Serveur Mail SMTP' },
      ]}
      headerTitle="Serveur de Messagerie Transactionnelle (SMTP)"
      headerSubtitle="Configurez les paramètres d'envoi des emails système, testez la délivrabilité et supervisez le statut de connexion SMTP."
      headerIcon={Mail}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
            {form.smtp_enabled ? "Service d'envoi actif" : 'Mode simulation dev'}
          </span>
        </div>
      }
      secondaryAction={
        <button
          type="button"
          onClick={runTest}
          disabled={testStatus === 'testing' || !testEmail}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-50 transition-colors"
        >
          <Send className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin text-[var(--rego-accent,#ad0505)]' : 'text-indigo-600'}`} />
          <span>Tester Délivrabilité</span>
        </button>
      }
      primaryAction={
        <button
          type="button"
          onClick={saveConfig}
          disabled={saving || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
        >
          <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          <span>{saving ? 'Enregistrement...' : 'Enregistrer Configuration'}</span>
        </button>
      }
      alertBanner={
        !form.smtp_enabled ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Mode Développement actif : Les emails transactionnels sont actuellement journalisés dans la console serveur sans être envoyés aux destinataires réels.
              </span>
            </div>
            <button
              onClick={() => updateField('smtp_enabled', true)}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              Activer l'envoi réel
            </button>
          </div>
        ) : saved ? (
          <div className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Paramètres de messagerie enregistrés avec succès !</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Erreur : {error}</span>
          </div>
        ) : null
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ReGoKpiHero
            label="Méthode de Transport"
            value={form.email_transport === 'brevo_api' ? 'Brevo HTTP' : 'SMTP Classique'}
            hint={form.email_transport === 'brevo_api' ? 'Port 443 (HTTPS Recommandé)' : 'Ports 25/465/587'}
            icon={Zap}
            accent={form.email_transport === 'brevo_api'}
          />
          <ReGoKpiHero
            label="Statut du Service"
            value={form.smtp_enabled ? 'En Ligne' : 'Mode Dev'}
            hint={form.smtp_enabled ? 'Délivrance réelle active' : 'Simulation console'}
            icon={Server}
          />
          <ReGoKpiHero
            label="Port & Protocole"
            value={`${form.smtp_port}`}
            hint={form.smtp_secure ? 'SSL Direct' : 'STARTTLS Négocié'}
            icon={Lock}
          />
          <ReGoKpiHero
            label="Expéditeur Officiel"
            value={form.smtp_from_name || 'PandaMarket'}
            hint={form.smtp_from_email || 'notifications@pandamarket.tn'}
            icon={Mail}
          />
          <ReGoKpiHero
            label="Authentification"
            value={existingPassSet || brevoApiKeySet ? 'Configurée' : 'Incomplète'}
            hint={existingPassSet || brevoApiKeySet ? 'Clé chiffrée en vault' : 'Requiert configuration'}
            icon={Shield}
          />
        </div>
      }
      filterToolbar={
        <div className="space-y-3 border-b border-[var(--rego-border,#dedede)]/70 pb-3">
          {/* Preset Buttons */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mr-1">
                Fournisseur :
              </span>
              {Object.entries(providerPresets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                    selectedPreset === key
                      ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                      : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Delivery Method Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-xs">
              <button
                type="button"
                onClick={() => updateField('email_transport', 'brevo_api')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  form.email_transport === 'brevo_api'
                    ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-accent,#ad0505)] shadow-2xs'
                    : 'text-[var(--rego-ink-2,#737373)]'
                }`}
              >
                Brevo HTTP API
              </button>
              <button
                type="button"
                onClick={() => updateField('email_transport', 'smtp')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  form.email_transport === 'smtp'
                    ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                    : 'text-[var(--rego-ink-2,#737373)]'
                }`}
              >
                SMTP Classique
              </button>
            </div>
          </div>
        </div>
      }
      mainContent={
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Configuration Forms */}
          <div className="lg:col-span-7 space-y-4">
            {form.email_transport === 'brevo_api' ? (
              <ReGoCard
                title="Configuration Brevo HTTP API"
                subtitle="Envoi direct via API REST sécurisée (Port 443 HTTPS)"
                icon={Zap}
              >
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Clé API Brevo (v3)
                      {brevoApiKeySet && !form.brevo_api_key && (
                        <span className="ml-2 text-[11px] text-emerald-600 font-normal">
                          ✓ Clé enregistrée (laisser vide pour conserver)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.brevo_api_key}
                        onChange={(e) => updateField('brevo_api_key', e.target.value)}
                        placeholder={brevoApiKeySet ? '••••••••••••••••••••••••' : 'xkeysib-...'}
                        className="w-full p-2 pr-9 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-fg,#111111)]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </ReGoCard>
            ) : (
              <ReGoCard
                title="Paramètres Serveur SMTP"
                subtitle="Hôte, port, identifiants et chiffrement de la passerelle"
                icon={Server}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        Hôte SMTP (Host)
                      </label>
                      <input
                        type="text"
                        value={form.smtp_host}
                        onChange={(e) => updateField('smtp_host', e.target.value)}
                        placeholder="smtp.mailgun.org"
                        className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        Port
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={65535}
                        value={form.smtp_port}
                        onChange={(e) => updateField('smtp_port', parseInt(e.target.value) || 587)}
                        className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Identifiant SMTP (Username / API Key)
                    </label>
                    <input
                      type="text"
                      value={form.smtp_user}
                      onChange={(e) => updateField('smtp_user', e.target.value)}
                      placeholder="postmaster@pandamarket.tn"
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Mot de Passe SMTP (Secret)
                      {existingPassSet && !form.smtp_pass && (
                        <span className="ml-2 text-[11px] text-emerald-600 font-normal">
                          ✓ Mot de passe enregistré (laisser vide pour conserver)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.smtp_pass}
                        onChange={(e) => updateField('smtp_pass', e.target.value)}
                        placeholder={existingPassSet ? '••••••••••••••••' : 'Saisir mot de passe'}
                        className="w-full p-2 pr-9 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-fg,#111111)]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="smtp_secure"
                      checked={form.smtp_secure}
                      onChange={(e) => updateField('smtp_secure', e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                    />
                    <label htmlFor="smtp_secure" className="font-bold text-[var(--rego-fg,#111111)] cursor-pointer">
                      Chiffrement SSL Direct (Port 465) — Cocher uniquement si votre serveur requiert SSL strict
                    </label>
                  </div>
                </div>
              </ReGoCard>
            )}

            {/* Sender Identity */}
            <ReGoCard
              title="Identité d'Expéditeur Officielle"
              subtitle="Nom et adresses email affichés aux acheteurs et marchands"
              icon={Mail}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Nom de l'Expéditeur
                  </label>
                  <input
                    type="text"
                    value={form.smtp_from_name}
                    onChange={(e) => updateField('smtp_from_name', e.target.value)}
                    placeholder="PandaMarket Tunisie"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Adresse Email d'Expédition
                  </label>
                  <input
                    type="email"
                    value={form.smtp_from_email}
                    onChange={(e) => updateField('smtp_from_email', e.target.value)}
                    placeholder="notifications@pandamarket.tn"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                  />
                </div>
              </div>
            </ReGoCard>
          </div>

          {/* Right Column: Live Test Console & Deliverability */}
          <div className="lg:col-span-5 space-y-4">
            <ReGoCard
              title="Simulateur de Test & Délivrabilité en Direct"
              subtitle="Envoyez un email transactionnel immédiat pour valider la chaîne SMTP"
              icon={Send}
            >
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Adresse Email Destinataire
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="admin@prodypanda.com"
                      className="flex-1 p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={runTest}
                      disabled={testStatus === 'testing' || !testEmail}
                      className="px-3.5 py-2 font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50 shrink-0"
                    >
                      {testStatus === 'testing' ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </div>

                {/* Console Log Return */}
                <div>
                  <span className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Console de Négociation & Rapport de Délivrabilité
                  </span>
                  <div className="p-3 rounded-[var(--rego-r,8px)] bg-slate-950 text-slate-100 font-mono text-[11px] min-h-[140px] max-h-56 overflow-y-auto space-y-1">
                    <p className="text-slate-400">// Diagnostic SMTP / API en attente d'exécution...</p>
                    {testStatus === 'testing' && (
                      <p className="text-amber-400 animate-pulse">
                        Connecting to transport endpoint...
                      </p>
                    )}
                    {testMessage && (
                      <div className={testStatus === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                        {testMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ReGoCard>
          </div>
        </div>
      }
    />
  );
}
