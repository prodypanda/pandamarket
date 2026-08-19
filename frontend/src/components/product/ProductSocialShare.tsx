'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Link as LinkIcon, Check, Send } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

export interface ProductSocialShareProps {
  title: string;
  price: number | string;
  url?: string;
  className?: string;
}

export const ProductSocialShare: React.FC<ProductSocialShareProps> = ({
  title,
  price,
  url,
  className = '',
}) => {
  const { t, dir } = useLocale();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  const getShareUrl = () => {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  };

  const formattedPrice = typeof price === 'number' ? price.toFixed(3) : Number(price || 0).toFixed(3);
  const shareUrl = getShareUrl();

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} - ${formattedPrice} TND sur PandaMarket`,
          url: shareUrl,
        });
      } catch {
        // User dismissed or aborted
      }
    }
  };

  const whatsappMessage = t('productV2.share.whatsappMessage', {
    title,
    price: formattedPrice,
    url: shareUrl,
  });

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      dir={dir}
      data-testid="product-social-share"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100/80 bg-white/80 p-3.5 shadow-xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
        <Share2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>{t('productV2.share.title')}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Native Mobile Share Sheet if available */}
        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            data-testid="share-native-btn"
            aria-label={t('productV2.share.title')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200 active:scale-95 dark:bg-white/10 dark:text-gray-300"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('productV2.share.title')}</span>
          </button>
        )}

        {/* WhatsApp 1-Click Share */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="share-whatsapp-btn"
          aria-label={t('productV2.share.shareWhatsapp')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366]/10 px-3 py-1.5 text-xs font-bold text-[#128C7E] transition hover:bg-[#25D366]/20 active:scale-95 dark:bg-[#25D366]/20 dark:text-[#25D366]"
        >
          <svg className="h-3.5 w-3.5 fill-[#25D366]" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.983.538 1.897.822 2.796.822 3.18 0 5.765-2.586 5.766-5.766.001-3.182-2.585-5.808-5.766-5.808zm0-2c4.28 0 7.766 3.485 7.766 7.768 0 4.282-3.486 7.768-7.766 7.768-1.282 0-2.502-.321-3.578-.891l-4.453 1.183 1.189-4.349c-.66-1.127-1.024-2.427-1.024-3.711 0-4.283 3.486-7.768 7.766-7.768z" />
          </svg>
          <span>{t('productV2.share.shareWhatsapp')}</span>
        </a>

        {/* Facebook Share */}
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="share-facebook-btn"
          aria-label={t('productV2.share.shareFacebook')}
          className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 active:scale-95 dark:bg-blue-950/40 dark:text-blue-400"
        >
          <svg className="h-4 w-4 fill-blue-600 dark:fill-blue-400" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>

        {/* Twitter / X Share */}
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="share-twitter-btn"
          aria-label="X (Twitter)"
          className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gray-100 text-gray-700 transition hover:bg-gray-200 active:scale-95 dark:bg-white/10 dark:text-gray-300"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopyLink}
          data-testid="share-copy-link-btn"
          aria-label={t('productV2.share.copyLink')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
            copied
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{t('productV2.share.linkCopied')}</span>
            </>
          ) : (
            <>
              <LinkIcon className="h-3.5 w-3.5" />
              <span>{t('productV2.share.copyLink')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
