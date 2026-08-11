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
  RotateCw,
  Ticket,
  Percent,
  Truck,
  Flame,
  ArrowRight,
  Copy,
  Check,
  Trophy,
  Zap,
  Star,
  Award,
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { fetchWithCsrf } from '../../lib/api';

export interface Prize {
  label: string;
  code: string;
  disc: number;
  icon: string;
  color: string;
  desc: string;
}

const DEFAULT_PRIZES: Prize[] = [
  { label: '5 DT Offerts', code: 'CHANCE5DT', disc: 5.0, icon: '🎟️', color: '#EF4444', desc: '5.000 DT de remise immédiate sur votre panier' },
  { label: 'Livraison 0 DT', code: 'LIVRAISON_ZERO', disc: 7.0, icon: '🚚', color: '#10B981', desc: 'Frais de livraison 100% offerts sur toute la Tunisie' },
  { label: '-10% Panier', code: 'PANDA10', disc: 10, icon: '🔥', color: '#F59E0B', desc: '10% de réduction immédiate sur toute votre commande' },
  { label: '15 DT Cadeau', code: 'SUPER15', disc: 15.0, icon: '🎁', color: '#8B5CF6', desc: '15.000 DT de réduction dès 80 DT d’achat' },
  { label: '-5% Fidélité', code: 'FIDELITE5', disc: 5, icon: '⭐', color: '#3B82F6', desc: '5% de réduction exclusive client VIP' },
  { label: '5 DT Offerts', code: 'CHANCE5DT', disc: 5.0, icon: '🎟️', color: '#EC4899', desc: '5.000 DT de remise immédiate' },
];

const STORAGE_SPIN_KEY = 'pd_last_spin_time';

// Canvas Confetti Generator
function triggerConfetti(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = canvas.parentElement?.clientWidth || 400;
  canvas.height = canvas.parentElement?.clientHeight || 400;

  const particles: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    vx: number;
    vy: number;
    rotation: number;
    vr: number;
  }> = [];

  const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FBBF24'];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2 - 40,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 12,
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 10,
    });
  }

  const startTime = Date.now();
  function animate() {
    if (!ctx || !canvas) return;
    const elapsed = Date.now() - startTime;
    if (elapsed > 2500) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.rotation += p.vr;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    requestAnimationFrame(animate);
  }
  animate();
}

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
  const [prizesList, setPrizesList] = useState<Prize[]>(DEFAULT_PRIZES);

  // Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [copied, setCopied] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState('');

  // Scratch Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Route Guard
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

  // Load Marketplace Config Settings
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
    } catch {}
  }, []);

  // Initialize Ultra-Realistic Holographic Scratch Foil
  useEffect(() => {
    if (gameMode === 'scratch' && canvasRef.current && isOpen && !wonPrize) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 150;

      // Metallic foil gradient
      const grad = ctx.createLinearGradient(0, 0, 320, 150);
      grad.addColorStop(0, '#94A3B8');
      grad.addColorStop(0.2, '#CBD5E1');
      grad.addColorStop(0.4, '#F1F5F9');
      grad.addColorStop(0.6, '#94A3B8');
      grad.addColorStop(0.8, '#E2E8F0');
      grad.addColorStop(1, '#64748B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 150);

      // Subtle metallic sparkle diagonal lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let i = -150; i < 400; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 100, 150);
        ctx.stroke();
      }

      // Metallic Stamp Text
      ctx.fillStyle = '#334155';
      ctx.font = '900 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowOffsetY = 1;
      ctx.fillText('✨ GRATTEZ ICI POUR DÉVOILER ✨', 160, 78);
      ctx.shadowOffsetY = 0;
    }
  }, [gameMode, isOpen, wonPrize]);

  const handleScratchMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (hasPlayedToday || wonPrize || !phone.trim() || phone.length < 8 || !consent) return;
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
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Trigger win after sufficient scratch
    if (!wonPrize) {
      const prize = prizesList[0] || DEFAULT_PRIZES[0];
      handleCompleteWin(prize, 'scratch_card');
    }
  };

  const handleSpinWheel = async () => {
    if (isSpinning || wonPrize || !phone.trim() || phone.length < 8 || !consent) return;
    setIsSpinning(true);

    const list = prizesList.length > 0 ? prizesList : DEFAULT_PRIZES;
    // eslint-disable-next-line react-hooks/purity
    const selectedIdx = Math.floor(Math.random() * list.length);
    const prize = list[selectedIdx];

    const sliceAngle = 360 / list.length;
    const targetAngle = 2160 + (360 - selectedIdx * sliceAngle - sliceAngle / 2);

    setWheelRotation(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      handleCompleteWin(prize, 'spin_wheel');
    }, 4500);
  };

  const handleCompleteWin = async (prize: Prize, type: 'spin_wheel' | 'scratch_card') => {
    setWonPrize(prize);
    localStorage.setItem(STORAGE_SPIN_KEY, Date.now().toString());
    setHasPlayedToday(true);

    // Burst confetti animation
    setTimeout(() => {
      triggerConfetti(confettiCanvasRef.current);
    }, 200);

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
      setAppliedFeedback('✅ Code promo activé avec succès dans votre panier !');
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

  if (isInternalOrAuthRoute || !enabled) return null;

  const currentPrizes = prizesList.length > 0 ? prizesList : DEFAULT_PRIZES;

  return (
    <>
      {/* Ultra-Realistic Glassmorphic Floating Trigger Widget */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          {/* Animated Glow Aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 via-red-600 to-purple-600 blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse" />

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative flex items-center gap-3 rounded-full bg-slate-950/90 border border-amber-400/40 px-4 py-3 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-red-500 shadow-inner text-slate-950 animate-bounce">
              <Gift className="h-4 w-4 stroke-[2.5]" />
            </span>
            <span className="hidden sm:inline font-black tracking-wide text-xs bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent uppercase">
              {buttonLabel || "🎁 Gagnez jusqu'à 15 DT !"}
            </span>
            <span className="inline sm:hidden font-black text-xs text-amber-300">Cadeaux</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
        </div>
      </div>

      {/* Main Ultra-Realistic Casino Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-amber-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 space-y-6 text-white">
            {/* Confetti Overlay Canvas */}
            <canvas ref={confettiCanvasRef} className="pointer-events-none absolute inset-0 z-20 w-full h-full" />

            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-red-500 to-purple-500" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-widest shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                Cadeaux Exclusive PandaMarket
              </div>
              <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent">
                Tentez Votre Chance & Gagnez !
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tournez la roue casino ou grattez la carte VIP pour obtenir votre code promo instantané.
              </p>
            </div>

            {/* Mode Switcher */}
            {!wonPrize && (
              <div className="flex items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => setGameMode('wheel')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                    gameMode === 'wheel'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎡 Roue Casino
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('scratch')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                    gameMode === 'scratch'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🪙 Carte VIP
                </button>
              </div>
            )}

            {/* Active Game Display */}
            {!wonPrize ? (
              <div className="space-y-5">
                {/* 1. Ultra 3D Wheel Mode */}
                {gameMode === 'wheel' && (
                  <div className="relative flex flex-col items-center justify-center py-2">
                    {/* Metallic 3D Pointer Needle */}
                    <div className="absolute top-[-4px] z-30 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                      <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400" />
                    </div>

                    {/* Outer Gold Bezel Rim Frame */}
                    <div className="relative p-2.5 rounded-full bg-gradient-to-tr from-amber-700 via-yellow-200 via-amber-500 to-amber-900 shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-amber-300/40">
                      {/* Inner Wheel Body */}
                      <div
                        className="relative w-64 h-64 rounded-full border-4 border-slate-950 shadow-2xl overflow-hidden transition-all duration-[4500ms] cubic-bezier(0.15, 0.9, 0.2, 1) flex items-center justify-center"
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
                                clipPath: 'polygon(50% 50%, 20% 0%, 80% 0%)',
                                backgroundColor: p.color,
                              }}
                            >
                              <span
                                className="absolute top-4 left-1/2 -translate-x-1/2 text-white font-black text-[11px] tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                                style={{ transform: 'translateX(-50%)' }}
                              >
                                {p.label}
                              </span>
                            </div>
                          );
                        })}

                        {/* Metallic Center Brass Emblem Cap */}
                        <div className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-700 border-2 border-amber-100 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] flex items-center justify-center text-slate-950 font-black text-sm">
                          🎁
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Ultra Scratch Card Mode */}
                {gameMode === 'scratch' && (
                  <div className="flex flex-col items-center justify-center space-y-3 py-2">
                    <div className="relative w-[320px] h-[150px] rounded-2xl overflow-hidden border-2 border-amber-400/60 bg-slate-950 p-4 text-center shadow-2xl flex flex-col items-center justify-center">
                      <div className="space-y-1">
                        <span className="text-3xl">🎉</span>
                        <p className="font-black text-amber-300 text-sm tracking-wide">FÉLICITATIONS !</p>
                        <p className="font-mono font-black text-2xl text-emerald-400">CHANCE5DT</p>
                        <p className="text-[11px] text-slate-300">5.000 DT de remise immédiate</p>
                      </div>

                      {/* Holographic Scratch Canvas Overlay */}
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
                <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-amber-300 tracking-wider">
                        📱 Téléphone Tunisien *
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs focus-within:border-amber-400 transition">
                        <span className="text-slate-400 font-bold">🇹🇳 +216</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          placeholder="98 123 456"
                          className="w-full font-mono font-bold text-white bg-transparent outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-amber-300 tracking-wider">
                        ✉️ Email (Optionnel)
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs focus-within:border-amber-400 transition">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@domaine.tn"
                          className="w-full text-white bg-transparent outline-none placeholder:text-slate-600"
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
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-[10px] text-slate-400 leading-tight">
                      J&apos;accepte de recevoir mes offres personnalisées par SMS / WhatsApp (Loi tunisienne PDP).
                    </span>
                  </label>
                </div>

                {/* Action Trigger Button */}
                {gameMode === 'wheel' && (
                  <button
                    type="button"
                    onClick={handleSpinWheel}
                    disabled={isSpinning || !phone.trim() || phone.length < 8 || !consent}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-sm hover:brightness-110 active:scale-[0.99] transition shadow-[0_10px_30px_rgba(245,158,11,0.3)] disabled:opacity-40 flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    {isSpinning ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>La roue tourne... Bonne chance !</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>Tourner La Roue Gratuitement !</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* Ultra Win Reward Display */
              <div className="text-center space-y-5 animate-in zoom-in-95 duration-300 py-2">
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 text-4xl shadow-[0_10px_30px_rgba(245,158,11,0.4)] border-2 border-yellow-200">
                  <Trophy className="w-12 h-12 stroke-[2.5]" />
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-black shadow-md">
                    ✓
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                    Félicitations ! Vous Avez Gagné :
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">{wonPrize.label}</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">{wonPrize.desc}</p>
                </div>

                {/* Coupon Code Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 flex items-center justify-between gap-3 max-w-sm mx-auto shadow-inner">
                  <div className="text-left">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Votre Code Promo :</span>
                    <p className="font-mono font-black text-xl text-amber-400 tracking-wider">{wonPrize.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-black hover:bg-amber-500/20 transition flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                {appliedFeedback ? (
                  <p className="text-xs font-black text-emerald-400 animate-in fade-in">{appliedFeedback}</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyToCart}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm hover:brightness-110 transition shadow-[0_10px_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Appliquer Directement à Mon Panier</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-white underline transition"
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
