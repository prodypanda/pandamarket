'use client';

import React, { useState, useEffect } from 'react';
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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Tunis');
  const [addressLine, setAddressLine] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

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

  const handleOpenModal = () => {
    setError('');
    setIsOpen(true);
  };

  const handleConfirmAndSend = (e: React.FormEvent) => {
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

    // Save contact cache
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

    // Clean variant label
    const cleanVariant = variantTitle ? variantTitle.replace(/\s+/g, ' ').trim() : null;

    // Clean product title (remove duplicate titles)
    const cleanTitle = productTitle.replace(/\s+/g, ' ').trim();

    // Calculate total price
    const totalPrice = (price * Math.max(1, quantity)).toFixed(3);

    // Format professional WhatsApp order message
    const messageLines = [
      `Bonjour *${storeName}*, je souhaite commander cet article :`,
      ``,
      `🛍️ *Produit :* ${cleanTitle}`,
      cleanVariant ? `🎨 *Variante / Option :* ${cleanVariant}` : null,
      `📦 *Quantité :* ${quantity}`,
      `💵 *Prix total :* ${totalPrice} ${currency}`,
      productUrl ? `🔗 *Lien :* ${productUrl}` : null,
      ``,
      `📍 *Coordonnées de Livraison :*`,
      `- *Nom & Prénom :* ${cleanName}`,
      `- *Téléphone :* +216 ${cleanPhoneInput}`,
      `- *Gouvernorat :* ${city}`,
      addressLine.trim() ? `- *Adresse :* ${addressLine.trim()}` : null,
      notes.trim() ? `- *Remarque :* ${notes.trim()}` : null,
      ``,
      `Merci de me confirmer la disponibilité et la date de livraison ! 🙏`,
    ].filter(Boolean);

    const fullMessage = messageLines.join('\n');
    const waUrl = `https://wa.me/${waVendorPhone}?text=${encodeURIComponent(fullMessage)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
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
            <form onSubmit={handleConfirmAndSend} className="space-y-3.5">
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
                    📱 Téléphone *
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
                className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black text-sm hover:bg-[#20bd5a] transition-all duration-200 shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer ma Commande sur WhatsApp 💬</span>
              </button>

              <p className="text-[10px] text-center text-slate-400 font-semibold">
                🔒 Vos informations sont transmises directement au vendeur pour préparer votre livraison.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
