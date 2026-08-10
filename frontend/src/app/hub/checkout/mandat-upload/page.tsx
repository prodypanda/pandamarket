'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  ArrowRight,
  Loader2,
  Info,
  Copy,
  Check,
  MessageSquare,
  UserPlus,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { HubFooter } from '../../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../../hooks/useMarketplaceTheme';
import { fetchWithCsrf } from '../../../../lib/api';

type MarketplaceThemeClasses = ReturnType<typeof useMarketplaceTheme>['classes'];

function MandatUploadContent({ classes, isAliExpress }: { classes: MarketplaceThemeClasses; isAliExpress: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderIdFromUrl = searchParams.get('order_id') || '';

  const [resolvedOrderId, setResolvedOrderId] = useState(orderIdFromUrl);
  const orderId = resolvedOrderId;

  // Gate state — when no order_id in URL
  const [manualRef, setManualRef] = useState('');
  const [gatePhone, setGatePhone] = useState('');
  const [gateSearching, setGateSearching] = useState(false);
  const [gateError, setGateError] = useState('');
  const [gateResults, setGateResults] = useState<Array<{ id: string; status: string; total: string; payment_gateway: string; created_at: string }> | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mandatInfo, setMandatInfo] = useState<{ recipient_name?: string; recipient_cin?: string; phone?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWithCsrf('/api/pd/subscriptions/mandat-instructions', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setMandatInfo(json?.data ?? null);
      })
      .catch(() => {
        // Fallback to default
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle manual order reference submission
  const handleManualRefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualRef.trim();
    if (!trimmed) {
      setGateError('Veuillez saisir une référence de commande.');
      return;
    }
    setGateError('');
    setResolvedOrderId(trimmed);
  };

  // Handle phone-based order search
  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = gatePhone.replace(/\D/g, '');
    if (clean.length < 8) {
      setGateError('Veuillez saisir un numéro tunisien valide (8 chiffres).');
      return;
    }
    setGateSearching(true);
    setGateError('');
    setGateResults(null);
    try {
      const res = await fetchWithCsrf('/api/pd/orders/guest-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: clean }),
      });
      const data = await res.json();
      if (res.ok) {
        const mandatOrders = (data.orders || []).filter(
          (o: { payment_gateway: string; status: string }) =>
            o.payment_gateway === 'manual_mandat' && o.status === 'payment_required',
        );
        if (mandatOrders.length === 0) {
          setGateError('Aucune commande Mandat Minute en attente trouvée pour ce numéro.');
        }
        setGateResults(mandatOrders);
      } else {
        setGateError(data?.error?.message || 'Recherche échouée.');
      }
    } catch {
      setGateError('Impossible de joindre le serveur.');
    } finally {
      setGateSearching(false);
    }
  };

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !orderId) return;
    setError('');
    setUploading(true);

    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Veuillez importer une image JPG, PNG ou WEBP du reçu.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('La taille de l\'image du reçu doit être inférieure à 10 Mo.');
      }

      // Step 1: Request presigned URL (guest allowed for mandat_proof)
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          purpose: 'mandat_proof',
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || 'Échec de préparation du téléversement.');
      }

      const presignData = await presignRes.json();
      const uploadUrl = presignData.upload_url as string | undefined;
      const fileKey = presignData.file_key as string | undefined;

      if (!uploadUrl || !fileKey) {
        throw new Error('URL de téléversement non reçue du serveur.');
      }

      // Step 2: Direct upload to storage (handles S3 direct or mock upload)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => null);
        throw new Error(
          errBody?.error?.message ||
          errBody?.message ||
          `Échec du téléversement du fichier (${uploadRes.status}). Veuillez réessayer.`,
        );
      }

      // Step 3: Register proof with order
      const proofRes = await fetchWithCsrf('/api/pd/payments/mandat/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: orderId,
          image_url: fileKey,
        }),
      });

      if (!proofRes.ok) {
        const proofErr = await proofRes.json().catch(() => null);
        throw new Error(proofErr?.error?.message || 'Échec de soumission de la preuve de paiement.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Téléversement échoué. Veuillez réessayer.');
    } finally {
      setUploading(false);
    }
  };

  const waSupportPhone = mandatInfo?.phone || '21699000000';
  const cleanWaPhone = waSupportPhone.replace(/\D/g, '');
  const waSupportUrl = `https://wa.me/${cleanWaPhone.startsWith('216') ? cleanWaPhone : `216${cleanWaPhone}`}?text=${encodeURIComponent(
    `Bonjour PandaMarket, voici ma référence de commande Mandat Minute : *${orderId}*. Je souhaite vous transmettre mon reçu ou obtenir de l'aide pour valider ma commande.`,
  )}`;

  // ─── GATE: No order reference → show entry screen ────────────────
  if (!orderId) {
    return (
      <div className={`${classes.panel} max-w-2xl mx-auto mt-8 p-6 sm:p-10 rounded-[2rem] shadow-xl space-y-7 animate-in fade-in duration-200`}>
        {/* Header */}
        <div className="text-center space-y-2 pb-4 border-b border-slate-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Envoi de Reçu Mandat Minute
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
            Saisissez votre référence de commande ou retrouvez-la avec votre numéro de téléphone.
          </p>
        </div>

        {/* Option 1: Enter order reference directly */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">1</span>
            <span className="text-sm font-black text-slate-800">J&apos;ai ma référence de commande</span>
          </div>
          <form onSubmit={handleManualRefSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              placeholder="Ex: pd_order_XXXXXXXXXXXXXXXX"
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 transition"
            />
            <button
              type="submit"
              className={`px-6 py-3 rounded-2xl font-black text-sm text-white transition hover:opacity-95 shadow-md cursor-pointer ${classes.primaryGradient}`}
            >
              <span className="flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4" />
                Continuer
              </span>
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Option 2: Search by phone */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">2</span>
            <span className="text-sm font-black text-slate-800">Retrouver ma commande par téléphone</span>
          </div>
          <form onSubmit={handlePhoneSearch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/70">
              <span className="text-sm font-bold text-slate-400">+216</span>
              <input
                type="tel"
                value={gatePhone}
                onChange={(e) => setGatePhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Ex: 98 123 456"
                className="w-full text-sm font-mono font-bold text-slate-900 bg-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={gateSearching}
              className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {gateSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Rechercher
            </button>
          </form>
        </div>

        {/* Error */}
        {gateError && (
          <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            {gateError}
          </p>
        )}

        {/* Phone search results */}
        {gateResults && gateResults.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-4 animate-in fade-in duration-200">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
              {gateResults.length} commande(s) Mandat en attente :
            </p>
            {gateResults.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setResolvedOrderId(o.id)}
                className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <span className="font-mono font-black text-sm text-slate-900">
                    #{o.id.slice(-8).toUpperCase()}
                  </span>
                  <p className="text-xs text-slate-500 font-medium">
                    {new Date(o.created_at).toLocaleDateString('fr-TN')} • {parseFloat(o.total).toFixed(3)} TND
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700 font-black text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  Envoyer le reçu
                </div>
              </button>
            ))}
          </div>
        )}

        {/* WhatsApp fallback */}
        <div className="pt-2 border-t border-slate-100">
          <a
            href={`https://wa.me/${cleanWaPhone.startsWith('216') ? cleanWaPhone : `216${cleanWaPhone}`}?text=${encodeURIComponent('Bonjour, j\'ai passé une commande Mandat Minute et je souhaite vous transmettre mon reçu. Pouvez-vous m\'aider ?')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-black text-xs transition border border-emerald-200 w-full"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Besoin d&apos;aide ? Contactez-nous via WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`${classes.panel} max-w-2xl mx-auto mt-12 p-8 sm:p-12 text-center rounded-3xl shadow-xl space-y-6 animate-in zoom-in-95 duration-200`}>
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${classes.primarySoft}`}>
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900">Reçu Transmis avec Succès !</h1>
          <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto">
            Nous avons bien reçu votre preuve de paiement. Votre commande <strong>{orderId}</strong> sera validée et expédiée dès vérification par nos équipes.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800">
            💡 Conseil : Vous pouvez suivre l&apos;évolution de votre colis à tout moment avec votre numéro de téléphone.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/register/buyer"
              className="inline-flex items-center gap-1.5 font-black text-[#B91C1C] hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Créer mon compte pour retrouver toutes mes commandes
            </Link>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/hub')}
            className={`w-full sm:w-auto px-8 py-3.5 font-black rounded-full transition-all hover:opacity-95 shadow-md ${classes.primaryGradient}`}
          >
            Retourner à l&apos;Accueil
          </button>
          <a
            href={waSupportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 font-black rounded-full bg-[#25D366] text-white hover:bg-[#20bd5a] transition shadow-md text-xs"
          >
            <MessageSquare className="w-4 h-4" />
            Assistance WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`${classes.panel} max-w-3xl mx-auto mt-8 p-6 sm:p-10 rounded-[2rem] shadow-xl space-y-6`}>
      {/* Header & Status */}
      <div className="space-y-3 border-b border-slate-100 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            En attente du reçu Mandat Minute
          </div>
          <span className="text-xs text-slate-400 font-semibold">Paiement sécurisé La Poste</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Validation du Mandat Minute
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Transmettez la photo de votre reçu pour confirmer l&apos;expédition de votre commande.
          </p>
        </div>
      </div>

      {/* Prominent Order Reference Card with Copy */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
              Référence de Commande
            </span>
            <span className="font-mono font-black text-lg sm:text-xl text-white tracking-wider">
              {orderId || 'COMMANDE-EN-COURS'}
            </span>
          </div>

          {orderId && (
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier la référence'}</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
          🔒 <strong>Vous pouvez fermer cette page à tout moment sans perdre votre commande.</strong> Vous pourrez envoyer votre reçu plus tard simplement avec votre numéro WhatsApp ou en contactant notre service client.
        </p>
      </div>

      {/* Mandat Postal Instructions Box */}
      <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4.5 text-xs text-amber-950 space-y-2">
        <div className="flex items-center gap-2 font-black text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Instructions pour le Mandat Minute à La Poste :</span>
        </div>
        <p className="leading-relaxed text-amber-900 font-medium">
          {mandatInfo?.recipient_name ? (
            <>
              Effectuez un transfert Mandat Minute au profit de <strong>{mandatInfo.recipient_name}</strong>
              {mandatInfo.recipient_cin ? ` (CIN: ${mandatInfo.recipient_cin})` : ''}.
            </>
          ) : (
            'Effectuez un transfert Mandat Minute au bureau de poste le plus proche avec les coordonnées reçues.'
          )}
          {' '}Prenez ensuite une photo nette de votre reçu jaune/bleu et déposez-la ci-dessous.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          file
            ? 'border-emerald-500 bg-emerald-50/40'
            : isAliExpress
            ? 'border-orange-300 hover:border-[#ff4747] bg-orange-50/30'
            : 'border-slate-300 hover:border-[#16C784] bg-slate-50/60'
        }`}
      >
        {file ? (
          <div className="space-y-2">
            <FileText className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-black text-sm text-slate-900">{file.name}</h3>
            <p className="text-xs font-bold text-emerald-700">Reçu sélectionné — Cliquez pour changer</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-black text-sm text-slate-900">Cliquez pour importer la photo du reçu</h3>
            <p className="text-xs text-slate-500 font-semibold">Formats acceptés : JPG, PNG, WEBP (Max 10 Mo)</p>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Submit Button */}
      <button
        type="button"
        disabled={!file || !orderId || uploading}
        onClick={handleUpload}
        className={`w-full text-white font-black text-sm sm:text-base py-4 rounded-full transition-all disabled:opacity-50 flex justify-center items-center gap-2 hover:opacity-95 shadow-lg cursor-pointer active:scale-98 ${classes.primaryGradient}`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Téléversement et vérification en cours...</span>
          </>
        ) : (
          <>
            <span>Valider et Transmettre Mon Reçu</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Help / Future Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <a
          href={waSupportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-black text-xs transition border border-emerald-200"
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          Envoyer le reçu via WhatsApp
        </a>

        <Link
          href="/register/buyer"
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs transition border border-slate-200"
        >
          <UserPlus className="w-4 h-4 text-slate-500" />
          Créer un compte pour lier cette commande
        </Link>
      </div>
    </div>
  );
}

export default function MandatUploadPage() {
  const { settings, classes, isAliExpress } = useMarketplaceTheme();

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="flex justify-center p-20">
              <Loader2 className={`w-8 h-8 animate-spin ${classes.primaryText}`} />
            </div>
          }
        >
          <MandatUploadContent classes={classes} isAliExpress={isAliExpress} />
        </Suspense>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
