'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Phone,
  ShieldCheck,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'vendor' | 'customer';
  title?: string;
  onSuccess?: (user: any) => void;
}

export function WhatsAppAuthModal({
  isOpen,
  onClose,
  role = 'vendor',
  title = role === 'vendor' ? 'Connexion / Inscription Vendeur par WhatsApp' : 'Connexion WhatsApp',
  onSuccess,
}: WhatsAppAuthModalProps) {
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setError('');
      setLoading(false);
      setDevOtpHint(null);
    }
  }, [isOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setError('Veuillez saisir un numéro de téléphone valide (min 8 chiffres).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pd/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Échec d\'envoi du code.');
      }

      if (data.dev_otp) {
        setDevOtpHint(data.dev_otp);
      }

      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || 'Impossible d\'envoyer le code WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pd/auth/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otp: fullOtp,
          role,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Code invalide.');
      }

      setStep('success');
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess(data.data.user);
        } else if (role === 'vendor') {
          router.push('/hub/dashboard');
        } else {
          router.push('/hub');
        }
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Vérification échouée. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 leading-snug">{title}</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Accès rapide et sécurisé par code 6 chiffres
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Phone Entry */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">
                Votre Numéro WhatsApp
              </label>
              <div className="flex items-center gap-2 px-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-emerald-500 transition">
                <span className="text-xs font-bold text-slate-500 border-r border-slate-200 pr-2">
                  +216
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 98 123 456"
                  className="w-full text-sm font-mono font-bold text-slate-900 bg-transparent outline-none"
                  autoFocus
                />
              </div>
            </div>

            {role === 'vendor' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sami"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ben Ali"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-black text-sm hover:bg-[#20bd5a] transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Recevoir le Code WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Entry */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-slate-600">
                Code à 6 chiffres envoyé au <strong className="text-slate-900">{phone}</strong>
              </p>
              {devOtpHint && (
                <p className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 py-1 px-2 rounded-lg inline-block">
                  💡 Code dev: {devOtpHint}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputsRef.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-13 text-center font-mono font-black text-xl text-slate-900 bg-slate-50 border-2 border-slate-200 focus:border-[#25D366] focus:bg-white rounded-2xl outline-none transition"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Valider & Connexion</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-slate-500 font-bold hover:underline"
              >
                Changer de numéro
              </button>
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={handleSendOtp}
                className="text-emerald-700 font-black disabled:opacity-40 hover:underline"
              >
                {resendTimer > 0 ? `Renvoyer (${resendTimer}s)` : 'Renvoyer le code'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success State */}
        {step === 'success' && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-in zoom-in-90 duration-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-slate-900">Vérification Réussie !</h4>
            <p className="text-xs text-slate-500 font-medium">Connexion en cours à votre espace...</p>
          </div>
        )}
      </div>
    </div>
  );
}
