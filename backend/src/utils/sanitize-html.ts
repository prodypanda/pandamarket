const ALLOWED_PRODUCT_DESCRIPTION_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'a',
  'code',
  'pre',
]);

function isSafeHref(value: string) {
  const trimmed = value.trim();
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed);
}

function getAttributeValue(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match?.[1] || match?.[2] || match?.[3] || '';
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeAllowedTag(tagName: string, attributes: string, isClosing: boolean) {
  const normalized = tagName.toLowerCase();
  if (!ALLOWED_PRODUCT_DESCRIPTION_TAGS.has(normalized)) return '';
  if (isClosing) return normalized === 'br' ? '' : `</${normalized}>`;
  if (normalized === 'br') return '<br>';
  if (normalized !== 'a') return `<${normalized}>`;

  const href = getAttributeValue(attributes, 'href');
  const title = getAttributeValue(attributes, 'title');
  const safeAttributes = [];

  if (href && isSafeHref(href)) {
    safeAttributes.push(`href="${escapeAttribute(href)}"`);
    safeAttributes.push('rel="noopener noreferrer"');
    if (/^https?:\/\//i.test(href)) safeAttributes.push('target="_blank"');
  }

  if (title) safeAttributes.push(`title="${escapeAttribute(title)}"`);

  return `<a${safeAttributes.length > 0 ? ` ${safeAttributes.join(' ')}` : ''}>`;
}

export function sanitizeProductDescription(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|applet|form)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|applet|form)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data):[^"]*"|'\s*(?:javascript|vbscript|data):[^']*'|\s*(?:javascript|vbscript|data):[^\s>]+)/gi, '')
    .replace(/<\s*(\/?)([a-zA-Z0-9-]+)([^>]*)>/g, (_match, closing: string, tagName: string, attributes: string) => sanitizeAllowedTag(tagName, attributes || '', closing === '/'));
}
