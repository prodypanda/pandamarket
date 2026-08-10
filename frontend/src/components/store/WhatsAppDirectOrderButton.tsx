'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface WhatsAppDirectOrderButtonProps {
  storePhone?: string | null;
  storeName: string;
  productTitle: string;
  price: number;
  currency?: string;
  variantTitle?: string;
  quantity?: number;
  productUrl?: string;
  className?: string;
}

const TUNISIAN_GOVERNORATES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Nabeul',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Le Kef',
  'Siliana',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Gabès',
  'Médenine',
  'Tataouine',
  'Gafsa',
  'Tozeur',
  'Kébili',
];

const STORAGE_CONTACT_KEY = 'pd_guest_contact_cache';

export function WhatsAppDirectOrderButton({
  storePhone,
  storeName,
  productTitle,
  price,
  currency = 'DT',
  variantTitle,
  quantity = 1,
  productUrl,
  className = '',
}: WhatsAppDirectOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'info' | 'otp' | 'success'>('info');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Tunis');
  const [addressLine, setAddressLine] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Pre-fill cached contact info if guest previously typed it
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CONTACT_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.city) setCity(parsed.city);
        if (parsed.addressLine) setAddressLine(parsed.addressLine);
      }
    } catch {
      // ignore
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOpenModal = () => {
    setError('');
    setStep('info');
    setIsOpen(true);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = fullName.trim();
    const cleanPhoneInput = phone.replace(/\D/g, '');

    if (!cleanName) {
      setError('Veuillez saisir votre nom et prénom.');
      return;
    }
    if (!cleanPhoneInput || cleanPhoneInput.length < 8) {
      setError('Veuillez saisir un numéro de téléphone tunisien valide (8 chiffres).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pd/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhoneInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Échec d\'envoi du code WhatsApp.');
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

  const handleConfirmAndSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Veuillez saisir le code WhatsApp à 6 chiffres.');
      return;
    }

    const cleanName = fullName.trim();
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(' ') || 'Client';
    const cleanPhoneInput = phone.replace(/\D/g, '');

    setLoading(true);
    setError('');

    try {
      // 1. Submit Fast WhatsApp Checkout API call
      const res = await fetch('/api/pd/auth/whatsapp/fast-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhoneInput,
          otp: fullOtp,
          first_name: firstName,
          last_name: lastName,
          address_line_1: addressLine.trim() || city,
          city,
          governorate: city,
          payment_gateway: 'cod',
          items: [
            {
              product_id: productUrl ? productUrl.split('/').pop() || 'prod' : 'prod',
              quantity: Math.max(1, quantity),
            },
          ],
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      const orderRef = data?.data?.order?.id || 'CMD-WA';

      // Cache contact info
      try {
        localStorage.setItem(
          STORAGE_CONTACT_KEY,
          JSON.stringify({
            fullName: cleanName,
            phone: cleanPhoneInput,
            city,
            addressLine: addressLine.trim(),
          }),
        );
      } catch {
        // ignore
      }

      // Normalize vendor phone
      const rawVendorPhone = storePhone || '21699000000';
      const cleanVendorPhone = rawVendorPhone.replace(/\D/g, '');
      const waVendorPhone = cleanVendorPhone.startsWith('216') ? cleanVendorPhone : `216${cleanVendorPhone}`;

      const totalPrice = (price * Math.max(1, quantity)).toFixed(3);

      // Format WhatsApp order text with official order reference
      const messageLines = [
        `Bonjour *${storeName}*, je viens de valider ma commande via PandaMarket Fast Checkout ! 🛍️`,
        ``,
        `🔖 *Référence commande :* #${orderRef.slice(-8).toUpperCase()}`,
        `🛍️ *Produit :* ${productTitle}`,
        variantTitle ? `🎨 *Variante :* ${variantTitle}` : null,
        `📦 *Quantité :* ${quantity}`,
        `💵 *Prix total :* ${totalPrice} ${currency}`,
        ``,
        `📍 *Coordonnées de Livraison Vérifiées (WhatsApp) :*`,
        `- *Nom :* ${cleanName}`,
        `- *Téléphone :* +216 ${cleanPhoneInput}`,
        `- *Ville / Gouvernorat :* ${city}`,
        addressLine.trim() ? `- *Adresse :* ${addressLine.trim()}` : null,
        notes.trim() ? `- *Remarque :* ${notes.trim()}` : null,
      ].filter(Boolean);

      const fullMessage = messageLines.join('\n');
      const waUrl = `https://wa.me/${waVendorPhone}?text=${encodeURIComponent(fullMessage)}`;

      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setStep('success');
      setTimeout(() => setIsOpen(false), 1500);
    } catch (err: any) {
      setError(err.message || 'Échec de la validation de commande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3.5 text-xs font-black text-white hover:bg-[#20bd5a] transition-all duration-200 shadow-md hover:shadow-green-500/20 active:scale-98 cursor-pointer ${className}`}
        title="Commander directement via WhatsApp"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">Commander via WhatsApp 🟢</span>
      </button>

      {/* Interactive Quick Order Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5">
            {/* Close */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#25D366]">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  Commander via WhatsApp
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  En direct avec <strong className="text-slate-800">{storeName}</strong>
                </p>
              </div>
            </div>

            {/* Product Recap Card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900 truncate">{productTitle}</p>
                {variantTitle && (
                  <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                    {variantTitle}
                  </p>
                )}
                <span className="text-[11px] text-slate-400 font-semibold">Qté: {quantity}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-black text-sm text-[#25D366]">
                  {(price * quantity).toFixed(3)} {currency}
                </p>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Paiement à la livraison</span>
              </div>
            </div>

            {/* Form */}
            {step === 'info' && (
              <form onSubmit={handleRequestOtp} className="space-y-3.5">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    👤 Nom & Prénom *
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Sami Trabelsi"
                      className="w-full font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-slate-600">
                      📱 WhatsApp / Téléphone *
                    </label>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs">
                      <span className="text-slate-400 font-bold">+216</span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="98 123 456"
                        className="w-full font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-slate-600">
                      📍 Gouvernorat *
                    </label>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full font-bold text-slate-900 bg-transparent outline-none cursor-pointer py-0.5"
                      >
                        {TUNISIAN_GOVERNORATES.map((gov) => (
                          <option key={gov} value={gov}>
                            {gov}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    🏠 Adresse complète / Cité
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="Ex: Av. Habib Bourguiba, Cité Ennasr"
                      className="w-full font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black text-sm hover:bg-[#20bd5a] transition-all duration-200 shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Continuer & Recevoir le Code 📱</span>
                </button>
              </form>
            )}

            {/* Step OTP */}
            {step === 'otp' && (
              <form onSubmit={handleConfirmAndSend} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                    {error}
                  </div>
                )}

                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-600">
                    Entrez le code à 6 chiffres envoyé au <strong className="text-slate-900">+216 {phone}</strong>
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
                      className="w-10 h-12 text-center font-mono font-black text-xl text-slate-900 bg-slate-50 border-2 border-slate-200 focus:border-[#25D366] focus:bg-white rounded-xl outline-none transition"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black text-sm hover:bg-[#20bd5a] transition-all duration-200 shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider & Commander sur WhatsApp 💬</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('info')}
                    className="text-slate-500 font-bold hover:underline"
                  >
                    Modifier mes infos
                  </button>
                  <button
                    type="button"
                    disabled={resendTimer > 0}
                    onClick={handleRequestOtp}
                    className="text-emerald-700 font-black disabled:opacity-40 hover:underline"
                  >
                    {resendTimer > 0 ? `Renvoyer (${resendTimer}s)` : 'Renvoyer le code'}
                  </button>
                </div>
              </form>
            )}

            {/* Step Success */}
            {step === 'success' && (
              <div className="py-6 text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-in zoom-in-90 duration-200">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-black text-slate-900">Commande Enregistrée !</h4>
                <p className="text-xs text-slate-500 font-medium">Ouverture de WhatsApp avec votre vendeur...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
