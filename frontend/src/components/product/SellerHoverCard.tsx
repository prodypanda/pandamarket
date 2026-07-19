'use client';

import { CalendarDays, CheckCircle2, ExternalLink, Globe2, Mail, MapPin, Package, Phone, Shield, Store } from 'lucide-react';
import Link from 'next/link';
import { getSellerTypeLabel } from '../../lib/seller-type';
import { useLocale } from '../../contexts/LocaleContext';

interface SellerSettings {
  logo_url?: string;
  store_description?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface SellerHoverCardProps {
  name: string;
  href?: string | null;
  websiteHref?: string | null;
  isVerified?: boolean | null;
  status?: string | null;
  sellerType?: string | null;
  createdAt?: string | null;
  productCount?: string | number | null;
  settings?: unknown;
  accentColor?: string;
}

function formatDate(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR';
  return date.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getSellerSettings(settings?: unknown): SellerSettings {
  if (!settings || typeof settings !== 'object') return {};
  const record = settings as Record<string, unknown>;
  return {
    logo_url: asString(record.logo_url),
    store_description: asString(record.store_description),
    description: asString(record.description),
    address: asString(record.address),
    city: asString(record.city),
    country: asString(record.country),
    contact_email: asString(record.contact_email),
    contact_phone: asString(record.contact_phone),
  };
}

function formatStatus(status: string | null | undefined, isVerified: boolean | null | undefined, t: (key: string) => string): string {
  if (isVerified) return t('sellerCard.verifiedSeller');
  if (!status) return t('sellerCard.marketplaceSeller');
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SellerHoverCard({
  name,
  href,
  websiteHref,
  isVerified,
  status,
  sellerType,
  createdAt,
  productCount,
  settings,
  accentColor = '#16C784',
}: SellerHoverCardProps) {
  const { locale, t } = useLocale();
  const sellerSettings = getSellerSettings(settings);
  const description = sellerSettings.store_description || sellerSettings.description;
  const location = [sellerSettings.address, sellerSettings.city, sellerSettings.country].filter(Boolean).join(', ');
  const statusLabel = formatStatus(status, isVerified, t);
  const sellerTypeLabel = getSellerTypeLabel(sellerType, t);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Two distinct destinations:
  // - href: the internal marketplace seller page (/store/{subdomain})
  // - websiteHref: the seller's own website (custom domain / subdomain URL)
  const marketplaceHref = href || null;
  const externalWebsiteHref = websiteHref && websiteHref !== href ? websiteHref : null;
  const mainHref = marketplaceHref || websiteHref || null;

  const row = (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 text-sm shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-gray-200 group-hover:shadow-lg">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-black shadow-sm ring-1 ring-gray-100" style={{ color: accentColor }}>
        {sellerSettings.logo_url ? (
          <div
            aria-label={name}
            role="img"
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${sellerSettings.logo_url})` }}
          />
        ) : (
          initials || <Store className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs text-gray-500">{sellerTypeLabel}</span>
        <span className="flex items-center gap-1 truncate font-black text-gray-900">
          {name}
          {isVerified && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: accentColor }} />}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-gray-500">{statusLabel}</span>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black shadow-sm" style={{ color: accentColor }}>
        {t('sellerCard.store')} <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </div>
  );

  return (
    <div className="group relative">
      {mainHref ? (
        <Link href={mainHref} className="block">
          {row}
        </Link>
      ) : (
        row
      )}

      <div className="pointer-events-none absolute left-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] translate-y-2 overflow-hidden rounded-3xl border border-gray-100 bg-white text-sm opacity-0 shadow-2xl shadow-slate-900/15 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <div className="relative p-5 text-white" style={{ background: `linear-gradient(135deg, ${accentColor}, #0f172a)` }}>
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/15 blur-xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-base font-black shadow-lg" style={{ color: accentColor }}>
              {sellerSettings.logo_url ? (
                <div
                  aria-label={name}
                  role="img"
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${sellerSettings.logo_url})` }}
                />
              ) : (
                initials || <Store className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-black text-white">
                <span className="truncate">{name}</span>
                {isVerified && <Shield className="h-4 w-4 shrink-0" />}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/75">{sellerTypeLabel} · {statusLabel}</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {description && <p className="line-clamp-3 text-sm leading-6 text-gray-600">{description}</p>}

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-gray-50 p-3">
              <CalendarDays className="mb-1 h-4 w-4 text-gray-400" />
              <p className="font-black text-gray-900">{formatDate(createdAt, locale, t('sellerCard.notProvided'))}</p>
              <p className="text-gray-500">{t('sellerCard.memberSince')}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <Package className="mb-1 h-4 w-4 text-gray-400" />
              <p className="font-black text-gray-900">{productCount || 0}</p>
              <p className="text-gray-500">{t('sellerCard.activeProducts')}</p>
            </div>
          </div>

          <div className="mt-3 space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
              <Shield className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{isVerified ? t('sellerCard.verifiedProfile') : t('sellerCard.marketplaceProfile')}</span>
            </div>
            {location && (
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{location}</span>
              </div>
            )}
            {sellerSettings.contact_email && (
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
                <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{sellerSettings.contact_email}</span>
              </div>
            )}
            {sellerSettings.contact_phone && (
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{sellerSettings.contact_phone}</span>
              </div>
            )}
          </div>

          {(marketplaceHref || externalWebsiteHref) && (
            <div className="mt-4 grid gap-2">
              {marketplaceHref && (
                <Link
                  href={marketplaceHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black text-white transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: accentColor }}
                >
                  {t('sellerCard.visitStore')} <Store className="h-3.5 w-3.5" />
                </Link>
              )}
              {externalWebsiteHref && (
                <a
                  href={externalWebsiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 bg-white px-4 py-3 text-xs font-black transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  Site officiel <Globe2 className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
