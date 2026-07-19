'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ShoppingBag, X } from 'lucide-react';
import { updateOnboardingStep } from '@/lib/onboarding';

interface BuyerWelcomeModalProps {
  onClose: () => void;
  onCompleted: () => void;
}

export function BuyerWelcomeModal({ onClose, onCompleted }: BuyerWelcomeModalProps) {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const res = await fetch('/api/pd/categories');
        if (res.ok && active) {
          const data = await res.json();
          setCategories(data.data || []);
        }
      } catch {
        // Fallback static categories
        if (active) {
          setCategories([
            { id: '1', name: 'Fashion & Apparel' },
            { id: '2', name: 'Electronics & Gadgets' },
            { id: '3', name: 'Home & Kitchen' },
            { id: '4', name: 'Health & Beauty' },
            { id: '5', name: 'Books & Stationery' },
          ]);
        }
      }
    }
    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  // Persist dismissal so the modal doesn't reappear on every visit,
  // then close. Used by the X button, backdrop click, and Escape key.
  const handleSkip = () => {
    updateOnboardingStep('buyer_welcome', {
      completed: true,
      metadata: { skipped: true, dismissed_at: new Date().toISOString() },
    }).catch(() => {
      // Persisting the skip is best-effort — never block closing
    });
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText('WELCOME10');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateOnboardingStep('buyer_welcome', {
        completed: true,
        metadata: {
          categories: selectedCategories,
          city,
          onboarded_at: new Date().toISOString(),
        },
      });
      setStep(3);
    } catch {
      // Local fallback on error
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    onCompleted();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-lg"
      onClick={(event) => {
        if (event.target === event.currentTarget && step < 3) handleSkip();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Welcome onboarding" className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/15 bg-[#0F0F23] p-8 text-white shadow-2xl shadow-red-950/30 ring-1 ring-white/10">
        {/* Decorative background gradients */}
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

        {step < 3 && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute right-6 top-6 rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="relative">
          {/* Progress Indicators */}
          <div className="mb-8 flex justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-[#B91C1C]' : s < step ? 'w-4 bg-emerald-500' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B91C1C]/10 text-[#B91C1C]">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-2xl font-black">Welcome to PandaMarket! 🐼</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Select your favorite categories so we can personalize your shopping experience.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md ${
                        isSelected
                          ? 'border-[#B91C1C] bg-[#B91C1C]/10 text-white'
                          : 'border-slate-700 bg-white/5 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-[#B91C1C]" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#B91C1C] to-[#7F1D1D] py-3.5 text-sm font-black text-white shadow-lg shadow-red-950/40 transition-transform hover:-translate-y-0.5 hover:from-[#D42020] hover:to-[#991B1B]"
                >
                  {selectedCategories.length > 0 ? 'Continue' : 'Skip — choose later'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-black">Where should we deliver? 📍</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Add your primary delivery location to get accurate shipping estimates.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                  Select your city
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white focus:border-[#B91C1C] focus:outline-none"
                >
                  <option value="" className="bg-[#0F0F23]">Select city...</option>
                  {[
                    'Tunis', 'Sfax', 'Sousse', 'Ariana', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
                    'Jendouba', 'Kairouan', 'Kasserine', 'Kebili', 'Kef', 'Mahdia', 'Manouba',
                    'Medenine', 'Monastir', 'Nabeul', 'Siliana', 'Tataouine', 'Tozeur', 'Zaghouan'
                  ].map((c) => (
                    <option key={c} value={c} className="bg-[#0F0F23]">{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl border border-slate-800 bg-transparent py-3.5 text-sm font-black text-slate-300 hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#B91C1C] to-[#7F1D1D] py-3.5 text-sm font-black text-white shadow-lg shadow-red-950/40 transition-transform hover:-translate-y-0.5 hover:from-[#D42020] hover:to-[#991B1B] disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {saving ? 'Saving...' : 'Finish Setup'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="text-6xl">🎉</div>
              <div>
                <h2 className="text-2xl font-black">You are ready!</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Use this promo code at checkout to get a 10% discount on your first order.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-dashed border-red-500/30 bg-red-500/5 p-4">
                <span className="block text-xs font-black uppercase tracking-widest text-slate-400">
                  Your Promo Code
                </span>
                <span className="mt-1 block text-2xl font-black tracking-widest text-[#B91C1C]">
                  WELCOME10
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 p-2 text-slate-300 hover:bg-[#B91C1C] hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDone}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#B91C1C] to-[#7F1D1D] py-3.5 text-sm font-black text-white shadow-lg shadow-red-950/40 transition-transform hover:-translate-y-0.5 hover:from-[#D42020] hover:to-[#991B1B]"
                >
                  Explore Marketplace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
