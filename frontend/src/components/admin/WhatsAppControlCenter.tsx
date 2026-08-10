'use client';

import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  QrCode,
  Smartphone,
  RefreshCw,
  LogOut,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Globe,
  ShieldCheck,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface WhatsAppControlCenterProps {
  settings: any;
  updateSetting: (key: any, value: any) => void;
}

export function WhatsAppControlCenter({ settings, updateSetting }: WhatsAppControlCenterProps) {
  const [activeSubTab, setActiveSubTab] = useState<'qr' | 'pair' | 'config' | 'test'>('qr');
  const [status, setStatus] = useState<{
    state: string;
    provider: string;
    instanceName: string;
    baseUrl: string;
    gatewayUrl: string;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // QR Code State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(15);

  // Pairing Code State
  const [pairPhone, setPairPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingPair, setLoadingPair] = useState(false);
  const [copiedPair, setCopiedPair] = useState(false);

  // Logout State
  const [loggingOut, setLoggingOut] = useState(false);

  // Test Message State
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; dev_otp?: string } | null>(null);

  // Fetch status
  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetchWithCsrf('/api/pd/auth/whatsapp/status');
      const data = await res.json();
      if (data.success && data.data) {
        setStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch status', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch QR Code
  const fetchQrCode = async () => {
    setLoadingQr(true);
    try {
      const res = await fetchWithCsrf('/api/pd/auth/whatsapp/qr-data');
      const data = await res.json();
      if (data.success && data.data) {
        setQrCode(data.data.base64);
        if (data.data.state === 'open') {
          setStatus((prev) => (prev ? { ...prev, state: 'open' } : null));
        }
      }
    } catch (err) {
      console.error('Failed to fetch QR code', err);
    } finally {
      setLoadingQr(false);
      setQrCountdown(15);
    }
  };

  // Request Pairing Code
  const handleRequestPairCode = async () => {
    if (!pairPhone || pairPhone.length < 8) return;
    setLoadingPair(true);
    setPairingCode(null);
    try {
      const res = await fetchWithCsrf('/api/pd/auth/whatsapp/pair-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairPhone }),
      });
      const data = await res.json();
      if (data.success && data.data?.pairingCode) {
        setPairingCode(data.data.pairingCode);
      } else {
        alert(data.error || 'Erreur lors de la génération du code de jumelage');
      }
    } catch (err: any) {
      alert(err.message || 'Erreur réseau');
    } finally {
      setLoadingPair(false);
    }
  };

  // Logout WhatsApp
  const handleLogout = async () => {
    if (!confirm('Voulez-vous vraiment déconnecter la session WhatsApp ?')) return;
    setLoggingOut(true);
    try {
      const res = await fetchWithCsrf('/api/pd/auth/whatsapp/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Session WhatsApp déconnectée');
        fetchStatus();
        fetchQrCode();
      } else {
        alert(data.error || 'Erreur lors de la déconnexion');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoggingOut(false);
    }
  };

  // Send Test Message
  const handleSendTestMessage = async () => {
    if (!testPhone || testPhone.length < 8) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetchWithCsrf('/api/pd/auth/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Erreur réseau' });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchQrCode();
  }, []);

  // Countdown timer for QR code auto refresh
  useEffect(() => {
    if (activeSubTab !== 'qr' || status?.state === 'open') return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          fetchQrCode();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSubTab, status?.state]);

  const isConnected = status?.state === 'open';

  return (
    <div className="space-y-8">
      {/* Header Banner & Live Status */}
      <div className="rounded-[2.5rem] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 p-8 text-white shadow-2xl shadow-slate-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Direct Evolution API Gateway
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Passerelle WhatsApp & SMS OTP
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Gérez la connexion de votre compte WhatsApp business pour l'envoi illimité et gratuit des SMS/WhatsApp OTP de vérification sur PandaMarket.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${isConnected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'bg-rose-500/20 border-rose-500/40 text-rose-200'}`}>
              <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <div className="text-left">
                <div className="text-xs uppercase font-extrabold tracking-wider opacity-75">Statut Connexion</div>
                <div className="text-sm font-black">{isConnected ? 'Connecté & Opérationnel ✅' : 'Non Connecté 📲'}</div>
              </div>
            </div>

            <button
              onClick={() => { fetchStatus(); fetchQrCode(); }}
              disabled={loadingStatus}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all active:scale-95 flex items-center justify-center"
              title="Rafraîchir le statut"
            >
              <RefreshCw className={`w-5 h-5 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {[
          { id: 'qr', label: 'Scanner QR Code Live', icon: QrCode },
          { id: 'pair', label: 'Code de Jumelage (Par Numéro)', icon: Smartphone },
          { id: 'config', label: 'Configuration API & Serveur', icon: Key },
          { id: 'test', label: 'Tester l\'envoi OTP', icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-[1.02]'
                  : 'bg-stone-100 text-slate-600 hover:bg-stone-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: QR CODE LIVE SCANNER */}
      {activeSubTab === 'qr' && (
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/40">
          {isConnected ? (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">WhatsApp est actuellement associé !</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Votre numéro WhatsApp est connecté via l'instance <span className="font-bold text-slate-800">{status?.instanceName}</span> et prêt à délivrer tous les OTP en temps réel.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-6 py-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold text-xs inline-flex items-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  {loggingOut ? 'Déconnexion en cours...' : 'Déconnecter la session WhatsApp'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left Column: QR Code Display */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-[2rem] text-white text-center shadow-inner relative">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Code QR mis à jour automatiquement ({qrCountdown}s)
                </div>

                {loadingQr ? (
                  <div className="w-64 h-64 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs font-medium text-slate-400">Génération du QR Code...</span>
                  </div>
                ) : qrCode ? (
                  <img
                    src={qrCode}
                    alt="WhatsApp Live QR Code"
                    className="w-64 h-64 rounded-2xl border-4 border-emerald-400 bg-white p-2 shadow-2xl transition-all"
                  />
                ) : (
                  <div className="w-64 h-64 flex flex-col items-center justify-center text-center p-4 bg-slate-800 rounded-2xl border border-slate-700">
                    <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                    <span className="text-xs font-bold text-slate-300">QR Code indisponible</span>
                    <button
                      onClick={fetchQrCode}
                      className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                  <button
                    onClick={fetchQrCode}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Forcer le rafraîchissement
                  </button>
                </div>
              </div>

              {/* Right Column: Step-by-Step Guide */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Comment associer votre WhatsApp ?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Suivez ces 3 étapes simples depuis l'application WhatsApp de votre smartphone.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { step: '1', title: 'Ouvrez WhatsApp', desc: 'Sur votre smartphone (Personal ou WhatsApp Business).' },
                    { step: '2', title: 'Accédez aux Réglages', desc: 'Allez dans Réglages ou Plus d\'options ➔ Appareils connectés.' },
                    { step: '3', title: 'Lier un appareil', desc: 'Appuyez sur "Lier un appareil" et pointez la caméra sur le QR Code à gauche.' },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-4 p-4 rounded-2xl bg-stone-50 border border-slate-200/80 items-start">
                      <div className="w-8 h-8 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center font-black text-sm shrink-0">
                        {s.step}
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">{s.title}</div>
                        <div className="text-xs font-medium text-slate-500">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAIRING CODE (PHONE METHOD) */}
      {activeSubTab === 'pair' && (
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/40 space-y-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#B91C1C]" />
              Associer via un Code de Jumelage (Sans Caméra)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Idéal si vous ne pouvez pas scanner le QR Code. Saisissez votre numéro pour recevoir un code à 8 caractères à entrer dans WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4 p-6 rounded-2xl bg-stone-50 border border-slate-200">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Numéro de téléphone WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="+216 98 123 456"
                  value={pairPhone}
                  onChange={(e) => setPairPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15"
                />
                <p className="text-[11px] text-slate-400">Incluez l'indicatif (+216 pour la Tunisie)</p>
              </div>

              <button
                onClick={handleRequestPairCode}
                disabled={loadingPair || !pairPhone}
                className="w-full py-3 px-6 rounded-xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingPair ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-emerald-400" />}
                Générer le Code à 8 Chiffres
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 text-white text-center min-h-[180px] flex flex-col items-center justify-center space-y-3">
              {pairingCode ? (
                <>
                  <div className="text-xs font-bold uppercase text-emerald-400">Votre Code de Jumelage</div>
                  <div className="text-3xl font-black tracking-widest bg-slate-800 px-6 py-3 rounded-xl border border-slate-700 font-mono text-emerald-300">
                    {pairingCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pairingCode);
                      setCopiedPair(true);
                      setTimeout(() => setCopiedPair(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedPair ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPair ? 'Copié !' : 'Copier le code'}
                  </button>
                </>
              ) : (
                <div className="text-slate-400 text-xs font-medium">
                  Saisissez votre numéro ci-contre pour afficher votre code ici.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURATION API & SERVEUR */}
      {activeSubTab === 'config' && (
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/40 space-y-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#B91C1C]" />
              Configuration de la Passerelle WhatsApp
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configurez le fournisseur de SMS / WhatsApp principal. Les modifications sont enregistrées directement dans la base de données.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
                Fournisseur SMS / WhatsApp Actif
              </label>
              <select
                value={settings.notifications_sms_provider}
                onChange={(e) => updateSetting('notifications_sms_provider', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
              >
                <option value="whatsapp_gateway">Passerelle WhatsApp QR (Evolution API / UltraMsg / Baileys)</option>
                <option value="meta_whatsapp">Meta WhatsApp Cloud API (Officiel Meta - 1,000 msg/mois)</option>
                <option value="twilio">Twilio SMS / WhatsApp</option>
                <option value="infobip">Infobip</option>
                <option value="console">Console / Dev mode (Simulateur)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
                Evolution API Base URL
              </label>
              <input
                type="text"
                value={settings.whatsapp_gateway_url || ''}
                onChange={(e) => updateSetting('whatsapp_gateway_url', e.target.value)}
                placeholder="https://evolution-api-5x9s.onrender.com"
                className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
                API Global Token / Key
              </label>
              <input
                type="password"
                value={settings.whatsapp_gateway_token || ''}
                onChange={(e) => updateSetting('whatsapp_gateway_token', e.target.value)}
                placeholder="sRdf4D54F1SDnuF511dvs541f21dvs51VsF21sGRfs541p2ou900a"
                className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
                Nom d'instance WhatsApp
              </label>
              <input
                type="text"
                value={settings.whatsapp_gateway_instance || ''}
                onChange={(e) => updateSetting('whatsapp_gateway_instance', e.target.value)}
                placeholder="pandamarket"
                className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">
                Nom d'expéditeur SMS / WhatsApp
              </label>
              <input
                type="text"
                value={settings.notifications_sms_sender_name || ''}
                onChange={(e) => updateSetting('notifications_sms_sender_name', e.target.value)}
                placeholder="PandaMarket"
                className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TEST ENVOI OTP */}
      {activeSubTab === 'test' && (
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/40 space-y-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-[#B91C1C]" />
              Tester l'Envoi d'un Message WhatsApp / SMS OTP
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Envoyez un code de test directement sur votre téléphone pour vérifier la bonne délivrabilité du service.
            </p>
          </div>

          <div className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Numéro de téléphone destinataire
              </label>
              <input
                type="text"
                placeholder="+216 98 123 456"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
              />
            </div>

            <button
              onClick={handleSendTestMessage}
              disabled={sendingTest || !testPhone}
              className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer Message Test WhatsApp
            </button>

            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                <div className="font-extrabold">{testResult.message}</div>
                {testResult.dev_otp && (
                  <div className="mt-1 font-mono text-xs">Code dev généré: {testResult.dev_otp}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
