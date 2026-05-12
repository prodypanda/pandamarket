import type { StoreBranding, StoreSocialPlatform } from './shared';

interface StorefrontSocialLinksProps {
  branding?: StoreBranding;
  className?: string;
  linkClassName?: string;
  showContact?: boolean;
}

const socialLabels: Record<StoreSocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  pinterest: 'Pinterest',
  snapchat: 'Snapchat',
};

const socialOrder = Object.keys(socialLabels) as StoreSocialPlatform[];

function safeHttpUrl(value?: string | null) {
  if (!value) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function safeText(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function contactHref(type: 'email' | 'phone', value: string) {
  const clean = value.replace(/[\r\n]/g, '').trim();
  if (!clean) return '';
  return type === 'email' ? `mailto:${clean}` : `tel:${clean.replace(/[^+\d]/g, '')}`;
}

export function StorefrontSocialLinks({
  branding,
  className = 'inline-flex flex-wrap items-center justify-center gap-2',
  linkClassName = 'font-semibold hover:underline',
  showContact = false,
}: StorefrontSocialLinksProps) {
  const socialItems = socialOrder
    .map((platform) => ({ platform, href: safeHttpUrl(branding?.social?.[platform]) }))
    .filter((item) => item.href);
  const email = safeText(branding?.contact_email);
  const phone = safeText(branding?.contact_phone);
  const location = [safeText(branding?.address), safeText(branding?.city), safeText(branding?.country)].filter(Boolean).join(', ');
  const mapHref = safeHttpUrl(branding?.map_embed_url);
  const contactItems = showContact
    ? [
        email ? { key: 'email', label: email, href: contactHref('email', email), target: undefined } : null,
        phone ? { key: 'phone', label: phone, href: contactHref('phone', phone), target: undefined } : null,
        location ? { key: 'location', label: location, href: mapHref || '', target: '_blank' } : null,
      ].filter((item): item is { key: string; label: string; href: string; target?: string } => Boolean(item?.label))
    : [];

  if (socialItems.length === 0 && contactItems.length === 0) return null;

  return (
    <span className={className}>
      {contactItems.map((item) => (
        item.href ? (
          <a key={item.key} href={item.href} target={item.target} rel={item.target ? 'noopener noreferrer' : undefined} className={linkClassName}>
            {item.label}
          </a>
        ) : (
          <span key={item.key}>{item.label}</span>
        )
      ))}
      {socialItems.map((item) => (
        <a key={item.platform} href={item.href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {socialLabels[item.platform]}
        </a>
      ))}
    </span>
  );
}
