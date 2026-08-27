'use client';

import React from 'react';

interface Props {
  phoneNumber?: string; // Format: 216XXXXXXXX
  storeName?: string;
  productTitle?: string;
}

export function WhatsAppSupportWidget({
  phoneNumber = '21620000000',
  storeName = 'PandaMarket',
  productTitle,
}: Props) {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const baseMessage = productTitle
    ? `Bonjour ${storeName}, je suis intéressé(e) par votre produit "${productTitle}". Pouvez-vous me renseigner ?`
    : `Bonjour ${storeName}, j'ai une question concernant ma commande sur PandaMarket.`;

  const encodedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(baseMessage)}`;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <a
        href={encodedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
        aria-label="Contacter le support client sur WhatsApp"
      >
        <span className="text-xl">💬</span>
        <span className="text-xs font-bold tracking-wide">WhatsApp Support</span>
      </a>
    </div>
  );
}
