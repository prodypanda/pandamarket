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
  Truck,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { fetchWithCsrf } from '../../lib/api';

interface PrizeItem {
  label: string;
  code: string;
  disc: number;
  icon: string;
  color: string;
  textColor: string;
  desc: string;
}

const PRIZES: PrizeItem[] = [
  { label: '5 DT Offerts', code: 'CHANCE5DT', disc: 5.0, icon: '🎟️', color: '#EF4444', textColor: '#FFFFFF', desc: '5.000 DT de remise immédiate sur votre commande' },
  { label: 'Livraison 0 DT', code: 'LIVRAISON_ZERO', disc: 7.0, icon: '🚚', color: '#10B981', textColor: '#FFFFFF', desc: 'Frais de livraison 100% offerts' },
  { label: '-10% Panier', code: 'PANDA10', disc: 10, icon: '🔥', color: '#F59E0B', textColor: '#FFFFFF', desc: '10% de réduction immédiate sur tous les articles' },
  { label: '15 DT Cadeau', code: 'SUPER15', disc: 15.0, icon: '🎁', color: '#8B5CF6', textColor: '#FFFFFF', desc: '15.000 DT de réduction dès 80 DT d’achat' },
  { label: '-5% Fidélité', code: 'FIDELITE5', disc: 5, icon: '⭐', color: '#3B82F6', textColor: '#FFFFFF', desc: '5% de réduction exclusive pour vous' },
  { label: '5 DT Offerts', code: 'CHANCE5DT', disc: 5.0, icon: '🎉', color: '#EC4899', textColor: '#FFFFFF', desc: '5.000 DT de remise immédiate' },
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
  const isDrawingRef = useRef(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);

  // Initialize Scratch Canvas
  const initScratchCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 150;

    const grad = ctx.createLinearGradient(0, 0, 320, 150);
    grad.addColorStop(0, '#94A3B8');
    grad.addColorStop(0.5, '#CBD5E1');
    grad.addColorStop(1, '#64748B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 150);

    // Decorative text
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪙 Grattez avec la souris ou au doigt 🪙', 160, 80);
    setScratchRevealed(false);
  }, []);

  useEffect(() => {
    if (gameMode === 'scratch' && isOpen && !wonPrize) {
      setTimeout(initScratchCanvas, 50);
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
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // After scratching, reveal prize
    if (!scratchRevealed) {
      setScratchRevealed(true);
      const prize = PRIZES[0]; // 5 DT
      setTimeout(() => {
        setWonPrize(prize);
      }, 700);
    }
  };

  const handleSpinWheel = () => {
    if (isSpinning || wonPrize) return;
    setIsSpinning(true);
    setFeedback('');

    // Pick random prize
    const selectedIdx = Math.floor(Math.random() * PRIZES.length);
    const prize = PRIZES[selectedIdx];

    // 6 slices: 60 deg each. Pointer at top (0 deg).
    // Target slice center: (selectedIdx * 60 + 30) deg.
    // 5 full rotations (1800 deg)
    const currentBase = Math.floor(wheelRotation / 360) * 360;
    const sliceAngle = 360 / PRIZES.length;
    const targetAngle = currentBase + 1800 + (360 - (selectedIdx * sliceAngle + sliceAngle / 2));

    setWheelRotation(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(prize);
    }, 4000);
  };

  const handleClaimReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wonPrize) return;

    // Apply coupon to cart
    const res = applyCoupon(wonPrize.code);
    setClaimed(true);

    if (res.success) {
      setFeedback('🎉 Code promo activé dans votre panier avec succès !');
    } else {
      setFeedback(res.message);
    }

    // Save lead to backend
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
      setTimeout(initScratchCanvas, 50);
    }
  };

  return (
    <>
      {/* Floating Trigger Badge */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#B91C1C] via-red-600 to-amber-600 px-5 py-3.5 text-white font-black text-xs shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-red-500/40 active:scale-95"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 animate-bounce">
            <Gift className="h-4 w-4" />
          </span>
          <span className="tracking-wide uppercase text-[11px] font-black">
            🎁 Gagnez vos Réductions !
          </span>
        </button>
      </div>

      {/* Main Interactive Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-[#B91C1C] text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Cadeaux & Réductions PandaMarket
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Tentez Votre Chance & Gagnez !
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tournez la roue ou grattez la carte pour remporter un bon de réduction immédiat.
              </p>
            </div>

            {/* Mode Selector */}
            {!wonPrize && (
              <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-100 max-w-xs mx-auto border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setGameMode('wheel'); handleResetGame(); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                    gameMode === 'wheel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🎡 Roue de la Fortune
                </button>
                <button
                  type="button"
                  onClick={() => { setGameMode('scratch'); handleResetGame(); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                    gameMode === 'scratch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🪙 Carte à Gratter
                </button>
              </div>
            )}

            {/* Game Screen */}
            {!wonPrize ? (
              <div className="space-y-6">
                {/* 1. Vector SVG Spin Wheel */}
                {gameMode === 'wheel' && (
                  <div className="relative flex flex-col items-center justify-center py-2">
                    {/* Top Pointer */}
                    <div className="absolute top-0 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-slate-900 drop-shadow-lg" />

                    {/* SVG Wheel */}
                    <div className="relative w-64 h-64 flex items-center justify-center">
                      <svg
                        viewBox="0 0 300 300"
                        className="w-full h-full rounded-full shadow-2xl border-4 border-slate-900 transition-all duration-[4000ms] ease-out"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          transformOrigin: 'center center',
                        }}
                      >
                        {PRIZES.map((prize, idx) => {
                          const anglePerSlice = 360 / PRIZES.length;
                          const startAngle = (idx * anglePerSlice - 90) * (Math.PI / 180);
                          const endAngle = ((idx + 1) * anglePerSlice - 90) * (Math.PI / 180);

                          const x1 = 150 + 150 * Math.cos(startAngle);
                          const y1 = 150 + 150 * Math.sin(startAngle);
                          const x2 = 150 + 150 * Math.cos(endAngle);
                          const y2 = 150 + 150 * Math.sin(endAngle);

                          const pathData = `M 150 150 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`;

                          // Text position
                          const midAngle = ((idx + 0.5) * anglePerSlice - 90) * (Math.PI / 180);
                          const textX = 150 + 95 * Math.cos(midAngle);
                          const textY = 150 + 95 * Math.sin(midAngle);
                          const textRot = (idx + 0.5) * anglePerSlice;

                          return (
                            <g key={idx}>
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

                        {/* Center Hub */}
                        <circle cx="150" cy="150" r="28" fill="#0F172A" stroke="#FFFFFF" strokeWidth="3" />
                        <text x="150" y="154" fill="#FFFFFF" fontSize="16" textAnchor="middle" fontWeight="bold">
                          🎁
                        </text>
                      </svg>
                    </div>

                    <button
                      type="button"
                      onClick={handleSpinWheel}
                      disabled={isSpinning}
                      className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-[#B91C1C] via-red-600 to-amber-600 text-white font-black text-sm hover:opacity-95 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
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
                  </div>
                )}

                {/* 2. Interactive Scratch Card */}
                {gameMode === 'scratch' && (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-80 h-36 rounded-3xl overflow-hidden border-2 border-dashed border-amber-400 bg-amber-50 shadow-inner flex items-center justify-center">
                      {/* Underneath Reward */}
                      <div className="text-center space-y-1 p-3">
                        <span className="text-2xl">🎉</span>
                        <p className="font-black text-amber-950 text-xs uppercase">Billet Gagnant !</p>
                        <p className="font-mono font-black text-2xl text-[#B91C1C]">CHANCE5DT</p>
                        <p className="text-[11px] font-bold text-amber-800">5.000 DT de réduction immédiate</p>
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
                      Faites glisser votre souris ou votre doigt sur le rectangle gris pour gratter.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Reward Won Screen & Lead Capture Form */
              <div className="space-y-5 animate-in zoom-in-95 duration-200">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl shadow-inner animate-bounce">
                    {wonPrize.icon}
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-600">Gagné ! Félicitations</span>
                  <h3 className="text-2xl font-black text-slate-900">{wonPrize.label}</h3>
                  <p className="text-xs text-slate-500">{wonPrize.desc}</p>
                </div>

                {/* Promo Code Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Code promo exclusif :</span>
                    <p className="font-mono font-black text-xl text-[#B91C1C]">{wonPrize.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                {/* Claim / Activate Form */}
                {!claimed ? (
                  <form onSubmit={handleClaimReward} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800">
                      Entrez vos coordonnées pour recevoir votre bon et l&apos;activer immédiatement :
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black uppercase text-slate-600">
                          📱 Mobile (Tunisie)
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
                          ✉️ Email
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
                        J&apos;accepte de recevoir des offres par SMS / WhatsApp (Loi tunisienne PDP).
                      </span>
                    </label>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Activer & Appliquer à Mon Panier</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-xs font-bold text-emerald-600 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                      {feedback || '✅ Votre réduction est active !'}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
                      >
                        Voir mon Panier
                      </button>
                      <button
                        type="button"
                        onClick={handleResetGame}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                      >
                        Rejouer
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
