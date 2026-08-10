'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Gift,
  Sparkles,
  X,
  CheckCircle2,
  Phone,
  Mail,
  RotateCw,
  Ticket,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Scissors,
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { fetchWithCsrf } from '../../lib/api';

interface PrizeItem {
  id: string;
  label: string;
  badge: string;
  code: string;
  disc: number;
  icon: string;
  color: string;
  textColor: string;
  desc: string;
}

const PRIZES: PrizeItem[] = [
  { id: 'p1', label: '5 DT Offerts', badge: 'REMISE FIXE', code: 'CHANCE5DT', disc: 5.0, icon: '🎟️', color: '#E11D48', textColor: '#FFFFFF', desc: '5.000 DT déduits immédiatement de votre commande' },
  { id: 'p2', label: 'Livraison 0 DT', badge: 'LIVRAISON OFFERTE', code: 'LIVRAISON_ZERO', disc: 7.0, icon: '🚚', color: '#059669', textColor: '#FFFFFF', desc: 'Frais de livraison 100% gratuits partout en Tunisie' },
  { id: 'p3', label: '-10% Panier', badge: 'REMISE POURCENTAGE', code: 'PANDA10', disc: 10, icon: '🔥', color: '#D97706', textColor: '#FFFFFF', desc: '10% de réduction sur l’ensemble de vos articles' },
  { id: 'p4', label: '15 DT Cadeau', badge: 'SUPER PROMO', code: 'SUPER15', disc: 15.0, icon: '🎁', color: '#7C3AED', textColor: '#FFFFFF', desc: '15.000 DT de remise dès 80 DT d’achats' },
  { id: 'p5', label: '-5% Fidélité', badge: 'BONUS FIDÉLITÉ', code: 'FIDELITE5', disc: 5, icon: '⭐', color: '#2563EB', textColor: '#FFFFFF', desc: '5% de réduction exclusive sur votre panier' },
  { id: 'p6', label: '5 DT Offerts', badge: 'CHANCE DU JOUR', code: 'CHANCE5DT', disc: 5.0, icon: '✨', color: '#0D9488', textColor: '#FFFFFF', desc: '5.000 DT de réduction immédiate' },
];

const STORAGE_SPIN_KEY = 'pd_last_spin_time';

export function GamifiedRewardsWidget({ storeId }: { storeId?: string }) {
  const { applyCoupon } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [gameMode, setGameMode] = useState<'wheel' | 'scratch'>('wheel');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);

  // Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<PrizeItem | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Scratch State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scratchRevealed, setScratchRevealed] = useState(false);

  // Initialize Scratch Canvas with metallic foil pattern
  const initScratchCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 340;
    canvas.height = 160;

    // Metallic foil gradient
    const grad = ctx.createLinearGradient(0, 0, 340, 160);
    grad.addColorStop(0, '#CBD5E1');
    grad.addColorStop(0.3, '#E2E8F0');
    grad.addColorStop(0.6, '#94A3B8');
    grad.addColorStop(1, '#64748B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 340, 160);

    // Diagonal texture stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;
    for (let i = -100; i < 450; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 160, 160);
      ctx.stroke();
    }

    // Call to action text
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ GRATTEZ ICI AVEC VOTRE DOIGT / SOURIS ✨', 170, 85);
    setScratchRevealed(false);
  }, []);

  useEffect(() => {
    if (gameMode === 'scratch' && isOpen && !wonPrize) {
      const timer = setTimeout(initScratchCanvas, 60);
      return () => clearTimeout(timer);
    }
  }, [gameMode, isOpen, wonPrize, initScratchCanvas]);

  const handleScratchMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (wonPrize || scratchRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    // Auto-reveal after initial scratch strokes
    if (!scratchRevealed) {
      setScratchRevealed(true);
      const prize = PRIZES[0]; // 5 DT
      setTimeout(() => {
        setWonPrize(prize);
      }, 600);
    }
  };

  const handleSpinWheel = () => {
    if (isSpinning || wonPrize) return;
    setIsSpinning(true);
    setFeedback('');

    const selectedIdx = Math.floor(Math.random() * PRIZES.length);
    const prize = PRIZES[selectedIdx];

    const currentBase = Math.floor(wheelRotation / 360) * 360;
    const sliceAngle = 360 / PRIZES.length;
    // 5 full rotations + alignment offset to slice center
    const targetAngle = currentBase + 1800 + (360 - (selectedIdx * sliceAngle + sliceAngle / 2));

    setWheelRotation(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(prize);
    }, 4200);
  };

  const handleClaimReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wonPrize) return;

    const res = applyCoupon(wonPrize.code);
    setClaimed(true);

    if (res.success) {
      setFeedback('🎉 Code promo activé dans votre panier !');
    } else {
      setFeedback(res.message);
    }

    try {
      await fetchWithCsrf('/api/pd/cart/gamified-spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          store_id: storeId || undefined,
          phone: phone.trim() || '21600000000',
          email: email.trim() || undefined,
          consent_given: consent,
          game_type: gameMode === 'wheel' ? 'spin_wheel' : 'scratch_card',
          prize_won: wonPrize.label,
          coupon_code: wonPrize.code,
          discount_value: wonPrize.disc,
        }),
      });
    } catch {
      // ignore
    }
  };

  const handleCopyCode = () => {
    if (!wonPrize) return;
    navigator.clipboard.writeText(wonPrize.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetGame = () => {
    setWonPrize(null);
    setClaimed(false);
    setFeedback('');
    setScratchRevealed(false);
    if (gameMode === 'scratch') {
      setTimeout(initScratchCanvas, 60);
    }
  };

  return (
    <>
      {/* Floating Trigger Pill on Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 rounded-full bg-slate-900/90 text-white px-4 py-3 shadow-2xl backdrop-blur-xl border border-white/15 hover:border-amber-400/50 hover:bg-slate-900 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          {/* Pulsing Gift Badge */}
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-red-500 shadow-md">
            <Gift className="h-4 w-4 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
          </span>

          <div className="text-left pr-1">
            <span className="block text-[11px] font-black uppercase tracking-wider text-amber-400 leading-tight">
              1 Tour Offert 🎁
            </span>
            <span className="block text-[10px] font-bold text-slate-300">
              Gagnez jusqu&apos;à 15 DT
            </span>
          </div>
        </button>
      </div>

      {/* Main Experience Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2.25rem] bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Luxury Badge */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-400/30 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                PandaMarket Rewards Club
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
                Tentez Votre Chance & Gagnez !
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                Tournez la roue ou grattez pour débloquer votre réduction immédiate sur votre panier.
              </p>
            </div>

            {/* Mode Switcher */}
            {!wonPrize && (
              <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-100 max-w-xs mx-auto border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setGameMode('wheel'); handleResetGame(); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    gameMode === 'wheel'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🎡 Roue de la Fortune
                </button>
                <button
                  type="button"
                  onClick={() => { setGameMode('scratch'); handleResetGame(); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    gameMode === 'scratch'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🪙 Carte à Gratter
                </button>
              </div>
            )}

            {/* Game Canvas Screen */}
            {!wonPrize ? (
              <div className="space-y-6">
                {/* 1. Wheel Mode */}
                {gameMode === 'wheel' && (
                  <div className="relative flex flex-col items-center justify-center py-2">
                    {/* Top Golden Needle Pointer */}
                    <div className="absolute top-0 z-20 flex flex-col items-center -translate-y-1">
                      <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-500 drop-shadow-md" />
                      <div className="w-3 h-3 -mt-1 rounded-full bg-amber-400 border-2 border-white shadow-xs" />
                    </div>

                    {/* Vector SVG Precision Wheel */}
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                      <svg
                        viewBox="0 0 300 300"
                        className="w-full h-full rounded-full shadow-2xl border-4 border-slate-900 transition-all duration-[4200ms] ease-out"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          transformOrigin: 'center center',
                        }}
                      >
                        {/* 6 Sectors */}
                        {PRIZES.map((prize, idx) => {
                          const anglePerSlice = 360 / PRIZES.length;
                          const startAngle = (idx * anglePerSlice - 90) * (Math.PI / 180);
                          const endAngle = ((idx + 1) * anglePerSlice - 90) * (Math.PI / 180);

                          const x1 = 150 + 150 * Math.cos(startAngle);
                          const y1 = 150 + 150 * Math.sin(startAngle);
                          const x2 = 150 + 150 * Math.cos(endAngle);
                          const y2 = 150 + 150 * Math.sin(endAngle);

                          const pathData = `M 150 150 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`;

                          const midAngle = ((idx + 0.5) * anglePerSlice - 90) * (Math.PI / 180);
                          const textX = 150 + 95 * Math.cos(midAngle);
                          const textY = 150 + 95 * Math.sin(midAngle);
                          const textRot = (idx + 0.5) * anglePerSlice;

                          return (
                            <g key={prize.id}>
                              <path d={pathData} fill={prize.color} stroke="#FFFFFF" strokeWidth="2" />
                              <text
                                x={textX}
                                y={textY}
                                fill={prize.textColor}
                                fontSize="12"
                                fontWeight="900"
                                textAnchor="middle"
                                dominantBaseline="central"
                                transform={`rotate(${textRot}, ${textX}, ${textY})`}
                              >
                                {prize.label}
                              </text>
                            </g>
                          );
                        })}

                        {/* Outer LED Dot Indicator Lights */}
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                          const rad = (deg - 90) * (Math.PI / 180);
                          const dotX = 150 + 140 * Math.cos(rad);
                          const dotY = 150 + 140 * Math.sin(rad);
                          return (
                            <circle
                              key={deg}
                              cx={dotX}
                              cy={dotY}
                              r="3"
                              fill="#FEF08A"
                              stroke="#D97706"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* Center Emblem Hub */}
                        <circle cx="150" cy="150" r="30" fill="#0F172A" stroke="#F59E0B" strokeWidth="3" />
                        <text x="150" y="155" fill="#FFFFFF" fontSize="16" textAnchor="middle" fontWeight="bold">
                          🎁
                        </text>
                      </svg>
                    </div>

                    <button
                      type="button"
                      onClick={handleSpinWheel}
                      disabled={isSpinning}
                      className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-[#B91C1C] to-amber-600 text-white font-black text-sm hover:opacity-95 transition-all shadow-xl hover:shadow-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      {isSpinning ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>La roue tourne... Bonne chance !</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Lancer la Roue Gratuitement !</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 2. Scratch Card Mode */}
                {gameMode === 'scratch' && (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-full max-w-sm h-40 rounded-3xl overflow-hidden border-2 border-dashed border-amber-400 bg-amber-50 shadow-inner flex items-center justify-center p-4">
                      {/* Revealed Content */}
                      <div className="text-center space-y-1">
                        <span className="text-3xl">🎉</span>
                        <p className="font-black text-amber-950 text-xs uppercase tracking-wider">
                          Ticket Gagnant PandaMarket !
                        </p>
                        <p className="font-mono font-black text-2xl text-[#B91C1C]">CHANCE5DT</p>
                        <p className="text-xs font-bold text-amber-800">5.000 DT de remise immédiate</p>
                      </div>

                      {/* Scratch Canvas Overlay */}
                      <canvas
                        ref={canvasRef}
                        onMouseMove={handleScratchMove}
                        onTouchMove={handleScratchMove}
                        className="absolute inset-0 cursor-crosshair touch-none w-full h-full"
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 font-semibold text-center">
                      Faites glisser la souris ou le doigt pour gratter la couche métallisée.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Reward Won - Voucher Ticket & Lead Claim Form */
              <div className="space-y-5 animate-in zoom-in-95 duration-200">
                {/* Perforated Luxury Voucher Ticket */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-5 border border-amber-400/40 shadow-xl space-y-4">
                  {/* Semicircle Ticket Notches */}
                  <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-r border-amber-400/40" />
                  <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-l border-amber-400/40" />

                  {/* Top Part */}
                  <div className="flex items-center justify-between gap-3 px-2">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                        {wonPrize.badge}
                      </span>
                      <h3 className="text-xl font-black text-white mt-1">{wonPrize.label}</h3>
                    </div>
                    <div className="text-3xl">{wonPrize.icon}</div>
                  </div>

                  {/* Dashed Tear Line */}
                  <div className="border-t border-dashed border-white/20 pt-3 flex items-center justify-between gap-3 px-2">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                        Code Promo Unique
                      </span>
                      <span className="font-mono font-black text-lg text-amber-400 tracking-wider">
                        {wonPrize.code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                {/* Lead Form to Activate in Cart */}
                {!claimed ? (
                  <form onSubmit={handleClaimReward} className="space-y-3.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800">
                      Activez et appliquez instantanément votre réduction à votre panier :
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black uppercase text-slate-600">
                          📱 Téléphone (Tunisie)
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

                    <label className="flex items-start gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                      />
                      <span className="text-[10px] text-slate-500 leading-tight">
                        J&apos;accepte de recevoir des offres exclusives par SMS / WhatsApp (Conforme loi tunisienne PDP).
                      </span>
                    </label>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Activer & Appliquer Directement au Panier</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-xs font-bold text-emerald-700 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                      {feedback || '✅ Votre réduction est active dans votre panier !'}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition cursor-pointer"
                      >
                        Voir Mon Panier 🛍️
                      </button>
                      <button
                        type="button"
                        onClick={handleResetGame}
                        className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                      >
                        Rejouer 🔄
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
