'use client';

import React from 'react';
import { MessageSquare, PhoneCall } from 'lucide-react';

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
  // Normalize phone number (Default to +216 if not provided)
  const rawPhone = storePhone || '21699000000';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('216') ? cleanPhone : `216${cleanPhone}`;

  // Formatted polite WhatsApp order message
  const lines = [
    `Bonjour *${storeName}*, je souhaite commander cet article en 1-clic :`,
    ``,
    `🛍️ *Produit :* ${productTitle}`,
    variantTitle ? `🎨 *Option / Variante :* ${variantTitle}` : null,
    `📦 *Quantité :* ${quantity}`,
    `💵 *Prix :* ${price.toFixed(3)} ${currency}`,
    productUrl ? `🔗 *Lien produit :* ${productUrl}` : null,
    ``,
    `📍 *Mes coordonnées de livraison :*`,
    `- Mon Nom & Prénom : `,
    `- Ma Ville / Gouvernorat : `,
    `- Mon Adresse complète : `,
    ``,
    `Merci de me confirmer la disponibilité et la date de livraison ! 🙏`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join('\n'));
  const waHref = `https://wa.me/${waPhone}?text=${encodedText}`;

  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3 text-xs sm:text-sm font-black text-white hover:bg-[#20bd5a] transition-all duration-200 shadow-sm hover:shadow-green-500/20 active:scale-98 ${className}`}
      title="Commander directement auprès du vendeur via WhatsApp"
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">Commander via WhatsApp</span>
    </a>
  );
}
