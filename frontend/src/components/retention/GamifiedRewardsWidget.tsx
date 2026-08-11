'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Gift,
  Sparkles,
  X,
  CheckCircle2,
  Phone,
  Mail,
  ShieldCheck,
  RotateCw,
  Ticket,
  Percent,
  Truck,
  Flame,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { fetchWithCsrf } from '../../lib/api';

const PRIZES = [
  { label: '5 DT Offerts', code: 'CHANCE5DT', disc: 5.0, icon: '🎟️', color: '#EF4444', desc: '5.000 DT de remise immédiate sur votre panier' },
  { label: 'Livraison 0 DT', code: 'LIVRAISON_ZERO', disc: 7.0, icon: '🚚', color: '#10B981', desc: 'Frais de livraison 100% offerts' },
  { label: '-10% Panier', code: 'PANDA10', disc: 10, icon: '🔥', color: '#F59E0B', desc: '10% de réduction immédiate sur toute votre commande' },
  { label: '15 DT Cadeau', code: 'SUPER15', disc: 15.0, icon: '🎁', color: '#8B5CF6', desc: '15.000 DT de réduction dès 80 DT d’achat' },
  { label: '-5% Fidélité', code: 'FIDELITE5', disc: 5, icon: '⭐', color: '#3B82F6', desc: '5% de réduction exclusive client' },
  { label: '5 DT Offerts', code: 'CHANCE5DT', disc: 5.0, icon: '🎟️', color: '#EC4899', desc: '5.000 DT de remise immédiate' },
];

const STORAGE_SPIN_KEY = 'pd_last_spin_time';

export function GamifiedRewardsWidget({ storeId }: { storeId?: string }) {
  const pathname = usePathname();
  const { applyCoupon } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [gameMode, setGameMode] = useState<'wheel' | 'scratch'>('wheel');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);

  // Dynamic Settings
  const [enabled, setEnabled] = useState(true);
  const [buttonLabel, setButtonLabel] = useState("🎁 Gagnez jusqu'à 15 DT !");
  const [prizesList, setPrizesList] = useState(PRIZES);

  // Route check
  const isInternalOrAuthRoute =
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/hub/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/vendors') ||
    pathname.startsWith('/stores') ||
    pathname.startsWith('/withdrawals') ||
    pathname.startsWith('/plans') ||
    pathname.startsWith('/marketplace-categories') ||
    pathname.startsWith('/ai-costs') ||
    pathname.startsWith('/audit-log') ||
    pathname.startsWith('/smtp-config') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/kyc') ||
    pathname.startsWith('/mandats') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/system-logs') ||
    pathname.startsWith('/buyer-audit-log') ||
    pathname.startsWith('/seller-audit-log') ||
    pathname.startsWith('/platform-analytics') ||
    pathname.startsWith('/platform-media') ||
    pathname.startsWith('/admin-notes') ||
    pathname.startsWith('/fraud-radar');

  useEffect(() => {
    let cancelled = false;
    async function loadWidgetSettings() {
      try {
        const res = await fetchWithCsrf('/api/pd/marketplace/settings');
        if (res.ok) {
          const json = await res.json();
          const settings = json.data || json;
          if (!cancelled) {
            if (settings.rewards_widget_enabled !== undefined && settings.rewards_widget_enabled !== null) {
              const isEnabled =
                settings.rewards_widget_enabled === true ||
                settings.rewards_widget_enabled === 'true' ||
                settings.rewards_widget_enabled === 1 ||
                settings.rewards_widget_enabled === '1';
              setEnabled(isEnabled);
            }
            if (settings.rewards_widget_button_label) {
              setButtonLabel(settings.rewards_widget_button_label);
            }
            if (settings.rewards_widget_prizes_json) {
              try {
                const parsed = typeof settings.rewards_widget_prizes_json === 'string'
                  ? JSON.parse(settings.rewards_widget_prizes_json)
                  : settings.rewards_widget_prizes_json;
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setPrizesList(parsed);
                }
              } catch {}
            }
          }
        }
      } catch {}
    }
    loadWidgetSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<typeof PRIZES[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState('');

  // Scratch Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scratchedPct, setScratchedPct] = useState(0);

  // Check 24h cooldown
  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_SPIN_KEY);
      if (last) {
        const diffHours = (Date.now() - parseInt(last, 10)) / (1000 * 3600);
        if (diffHours < 24) {
          setHasPlayedToday(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize Scratch Canvas
  useEffect(() => {
    if (gameMode === 'scratch' && canvasRef.current && isOpen && !wonPrize) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 300;
      canvas.height = 140;

      // Draw shiny silver/gold scratch surface
      const grad = ctx.createLinearGradient(0, 0, 300, 140);
      grad.addColorStop(0, '#CBD5E1');
      grad.addColorStop(0.5, '#E2E8F0');
      grad.addColorStop(1, '#94A3B8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 300, 140);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ Grattez ici avec la souris / doigt ✨', 150, 75);
    }
  }, [gameMode, isOpen, wonPrize]);

  const handleScratchMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (hasPlayedToday || wonPrize || !phone.trim() || !consent) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    setScratchedPct((prev) => {
      const next = prev + 5;
      if (next >= 40 && !wonPrize) {
        // Trigger win
        const prize = prizesList[0] || PRIZES[0];
        handleCompleteWin(prize, 'scratch_card');
      }
      return next;
    });
  };

  const handleSpinWheel = async () => {
    if (isSpinning || wonPrize || !phone.trim() || !consent) return;
    setIsSpinning(true);

    const list = prizesList.length > 0 ? prizesList : PRIZES;
    const selectedIdx = Math.floor(Math.random() * list.length);
    const prize = list[selectedIdx];

    const sliceAngle = 360 / list.length;
    const targetAngle = 1800 + (360 - selectedIdx * sliceAngle - sliceAngle / 2);

    setWheelRotation(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      handleCompleteWin(prize, 'spin_wheel');
    }, 4500);
  };

  const handleCompleteWin = async (prize: typeof PRIZES[0], type: 'spin_wheel' | 'scratch_card') => {
    setWonPrize(prize);
    localStorage.setItem(STORAGE_SPIN_KEY, Date.now().toString());
    setHasPlayedToday(true);

    try {
      await fetchWithCsrf('/api/pd/retention/rewards-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          email: email.trim() || null,
          prize_code: prize.code,
          prize_label: prize.label,
          type,
          store_id: storeId || null,
        }),
      });
    } catch {}
  };

  const handleApplyToCart = () => {
    if (!wonPrize) return;
    const res = applyCoupon(wonPrize.code);
    if (res.success) {
      setAppliedFeedback('✅ Code promo activé dans votre panier !');
    } else {
      setAppliedFeedback(res.message);
    }
  };

  const handleCopyCode = () => {
    if (!wonPrize) return;
    navigator.clipboard.writeText(wonPrize.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hide widget on internal admin / auth routes or if disabled in platform config
  if (isInternalOrAuthRoute || !enabled) return null;

  const currentPrizes = prizesList.length > 0 ? prizesList : PRIZES;

  return (
    <>
      {/* Floating Trigger Button on Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#B91C1C] via-red-600 to-amber-600 px-4 py-3 text-white font-black text-xs shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-red-500/30"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 animate-bounce">
            <Gift className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline tracking-wide uppercase text-[11px]">
            {buttonLabel || "🎁 Gagnez jusqu'à 15 DT !"}
          </span>
          <span className="inline sm:hidden font-bold">Cadeaux</span>
        </button>
      </div>

      {/* Main Interactive Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-[#B91C1C] text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Cadeaux & Réductions PandaMarket
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Tentez Votre Chance & Gagnez !
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tournez la roue ou grattez pour débloquer votre code promo immédiat sur vos achats.
              </p>
            </div>

            {/* Mode Switcher */}
            {!wonPrize && (
              <div className="flex items-center justify-center gap-2 p-1 rounded-2xl bg-slate-100 max-w-xs mx-auto border border-slate-200">
                <button
                  type="button"
                  onClick={() => setGameMode('wheel')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                    gameMode === 'wheel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🎡 Roue de la Fortune
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('scratch')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                    gameMode === 'scratch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🪙 Carte à Gratter
                </button>
              </div>
            )}

            {/* Active Game Display */}
            {!wonPrize ? (
              <div className="space-y-6">
                {/* 1. Spin Wheel Mode */}
                {gameMode === 'wheel' && (
                  <div className="relative flex flex-col items-center justify-center py-2">
                    {/* Pointer */}
                    <div className="absolute top-0 z-10 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-slate-900 drop-shadow-md" />

                    {/* Wheel Canvas / SVG */}
                    <div
                      className="relative w-64 h-64 rounded-full border-4 border-slate-900 shadow-xl overflow-hidden transition-all duration-[4500ms] ease-out flex items-center justify-center"
                      style={{
                        transform: `rotate(${wheelRotation}deg)`,
                      }}
                    >
                      {currentPrizes.map((p, idx) => {
                        const angle = (360 / currentPrizes.length) * idx;
                        return (
                          <div
                            key={idx}
                            className="absolute top-0 left-0 w-full h-full"
                            style={{
                              transform: `rotate(${angle}deg)`,
                              clipPath: 'polygon(50% 50%, 21% 0%, 79% 0%)',
                              backgroundColor: p.color,
                            }}
                          >
                            <span
                              className="absolute top-4 left-1/2 -translate-x-1/2 text-white font-black text-[11px] tracking-tight whitespace-nowrap drop-shadow-sm"
                              style={{ transform: 'translateX(-50%) rotate(0deg)' }}
                            >
                              {p.label}
                            </span>
                          </div>
                        );
                      })}
                      {/* Center Hub */}
                      <div className="absolute w-12 h-12 rounded-full bg-slate-900 border-4 border-white shadow-md flex items-center justify-center text-white font-black text-xs">
                        🎁
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Scratch Card Mode */}
                {gameMode === 'scratch' && (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-center">
                      <div className="space-y-1">
                        <span className="text-2xl">🎉</span>
                        <p className="font-black text-amber-900 text-sm">FÉLICITATIONS !</p>
                        <p className="font-mono font-black text-xl text-[#B91C1C]">CHANCE5DT</p>
                        <p className="text-[11px] text-amber-800">5.000 DT de remise immédiate</p>
                      </div>

                      {/* Scratch Canvas Overlay */}
                      <canvas
                        ref={canvasRef}
                        onMouseMove={handleScratchMove}
                        onTouchMove={handleScratchMove}
                        className="absolute inset-0 cursor-crosshair touch-none"
                      />
                    </div>
                  </div>
                )}

                {/* Player Identification & PDP Consent Form */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-slate-600">
                        📱 Téléphone Tunisien *
                      </label>
                      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                        <span className="text-slate-400 font-bold">+216</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          placeholder="98 123 456"
                          className="w-full font-mono font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-slate-600">
                        ✉️ Email (Optionnel)
                      </label>
                      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@domaine.tn"
                          className="w-full text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tunisian PDP Explicit Consent */}
                  <label className="flex items-start gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                    />
                    <span className="text-[10px] text-slate-500 leading-tight">
                      J&apos;accepte de recevoir des codes de réduction et offres personnalisées par SMS / WhatsApp (Loi tunisienne sur la protection des données).
                    </span>
                  </label>
                </div>

                {/* Action Trigger Button */}
                {gameMode === 'wheel' && (
                  <button
                    type="button"
                    onClick={handleSpinWheel}
                    disabled={isSpinning || !phone.trim() || phone.length < 8 || !consent}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#B91C1C] to-amber-600 text-white font-black text-sm hover:opacity-95 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSpinning ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>La roue tourne... Bonne chance !</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Tourner la Roue Gratuitement !</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* Win Reward Display */
              <div className="text-center space-y-5 animate-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl shadow-inner">
                  {wonPrize.icon}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-emerald-600">Félicitations ! Vous avez gagné :</span>
                  <h3 className="text-2xl font-black text-slate-900">{wonPrize.label}</h3>
                  <p className="text-xs text-slate-500">{wonPrize.desc}</p>
                </div>

                {/* Coupon Code Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 max-w-sm mx-auto">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Votre Code Promo :</span>
                    <p className="font-mono font-black text-lg text-[#B91C1C]">{wonPrize.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                {appliedFeedback ? (
                  <p className="text-xs font-bold text-emerald-600 animate-in fade-in">{appliedFeedback}</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyToCart}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Appliquer Directement à Mon Panier</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 underline"
                >
                  Continuer mes achats
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
