'use client';

/**
 * SafePageRenderer — Renders Page Builder HTML/CSS with DOMPurify sanitization.
 * ─────────────────────────────────────────────────────────────────────────────
 * Used on the public storefront to render vendor-created page content safely.
 * Sanitizes both HTML and CSS to prevent XSS attacks from stored content.
 *
 * The backend already sanitizes on write, but this provides defense-in-depth
 * on the rendering side as well.
 */

import { useEffect, useRef } from 'react';
import DOMPurify, { type Config } from 'dompurify';
import { fetchWithCsrf } from '@/lib/api';
import {
  buildPageBuilderAnalyticsPayload,
  resolvePageBuilderAnalyticsEventType,
  type PageBuilderAnalyticsConfig,
  type PageBuilderAnalyticsEventType,
} from '@/lib/page-builder-analytics';
import { renderPageBuilderDynamicBlocks, type PageBuilderDynamicContext } from './dynamic-blocks';

interface SafePageRendererProps {
  html: string;
  css: string;
  dynamicContext?: PageBuilderDynamicContext;
  analytics?: PageBuilderAnalyticsConfig;
}

const PAGE_CONTENT_SELECTOR = '.gjs-page-content';
const VISITOR_STORAGE_KEY = 'pd_page_builder_visitor_id';

// Configure DOMPurify to allow a generous set of tags for page builder output
const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [
    // Structure
    'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
    // Text
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'blockquote', 'pre', 'code',
    'strong', 'em', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark',
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    // Links & Media
    'a', 'img', 'picture', 'source', 'video', 'audio', 'figure', 'figcaption',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    // Form display (read-only rendering)
    'input', 'textarea', 'button', 'label', 'select', 'option',
    // Other
    'details', 'summary', 'time', 'address', 'abbr', 'cite', 'q',
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'href', 'src', 'alt', 'title', 'width', 'height',
    'target', 'rel', 'type', 'placeholder', 'rows', 'cols', 'colspan', 'rowspan',
    'loading', 'decoding', 'srcset', 'sizes', 'media', 'role', 'aria-label',
    'aria-hidden', 'data-*', 'name', 'value', 'disabled', 'readonly',
  ],
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ['target'],
};

function getPageBuilderVisitorId(): string | undefined {
  try {
    const stored = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (stored) return stored;
    const next = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}

async function trackPageBuilderEvent(
  analytics: PageBuilderAnalyticsConfig | undefined,
  eventType: PageBuilderAnalyticsEventType,
  details: { productId?: string; targetUrl?: string; targetLabel?: string } = {},
) {
  if (!analytics?.enabled || !analytics.storeId || !analytics.pageId) return;
  await fetchWithCsrf('/api/pd/analytics/page-builder/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify(buildPageBuilderAnalyticsPayload(analytics, eventType, {
      ...details,
      visitorId: getPageBuilderVisitorId(),
    })),
  }).catch(() => undefined);
}

function neutralizeForms(html: string): string {
  return html
    .replace(/<form\b/gi, '<div data-pd-form-placeholder="true"')
    .replace(/<\/form>/gi, '</div>');
}

function pageBodyHtml(html: string): string {
  const bodyMatch = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return bodyMatch?.[1] || html;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isUnsafeUrl(value: string, allowDataImage = false): boolean {
  const compact = [...value.trim()]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127 && !/\s/.test(char);
    })
    .join('')
    .toLowerCase();
  if (compact.startsWith('javascript:') || compact.startsWith('vbscript:')) return true;
  if (compact.startsWith('data:')) return !(allowDataImage && compact.startsWith('data:image/'));
  return false;
}

function findCssUrlClose(input: string, start: number): number {
  let quote: string | null = null;
  for (let i = start; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ')') return i;
  }
  return -1;
}

function cssUrlValue(raw: string): string {
  const trimmed = raw.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function sanitizeCssUrls(css: string): string {
  let output = '';
  let index = 0;
  const pattern = /url\s*\(/gi;
  while (index < css.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(css);
    if (!match) {
      output += css.slice(index);
      break;
    }
    const valueStart = pattern.lastIndex;
    const closeIndex = findCssUrlClose(css, valueStart);
    if (closeIndex === -1) {
      output += css.slice(index);
      break;
    }
    const rawValue = css.slice(valueStart, closeIndex);
    output += css.slice(index, match.index);
    output += isUnsafeUrl(cssUrlValue(rawValue), true) ? 'url()' : css.slice(match.index, closeIndex + 1);
    index = closeIndex + 1;
  }
  return output;
}

function findNextTopLevelBrace(input: string, start: number): number {
  let quote: string | null = null;
  let squareDepth = 0;
  let parenDepth = 0;
  for (let i = start; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '[') squareDepth++;
    if (char === ']') squareDepth = Math.max(0, squareDepth - 1);
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === '{' && squareDepth === 0 && parenDepth === 0) return i;
  }
  return -1;
}

function findMatchingBrace(input: string, openIndex: number): number {
  let quote: string | null = null;
  let depth = 0;
  for (let i = openIndex; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return input.length - 1;
}

function splitSelectorList(selectorText: string): string[] {
  const selectors: string[] = [];
  let quote: string | null = null;
  let squareDepth = 0;
  let parenDepth = 0;
  let start = 0;
  for (let i = 0; i < selectorText.length; i++) {
    const char = selectorText[i];
    if (quote) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '[') squareDepth++;
    if (char === ']') squareDepth = Math.max(0, squareDepth - 1);
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === ',' && squareDepth === 0 && parenDepth === 0) {
      selectors.push(selectorText.slice(start, i));
      start = i + 1;
    }
  }
  selectors.push(selectorText.slice(start));
  return selectors;
}

function prefixSelector(selector: string): string {
  const trimmed = selector.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(PAGE_CONTENT_SELECTOR)) return trimmed;
  if (/^(html|body)$/i.test(trimmed)) return PAGE_CONTENT_SELECTOR;
  if (/^(html|body)\s+/i.test(trimmed)) {
    return `${PAGE_CONTENT_SELECTOR} ${trimmed.replace(/^(html|body)\s+/i, '')}`;
  }
  if (/^:root\b/i.test(trimmed)) {
    return trimmed.replace(/^:root\b/i, PAGE_CONTENT_SELECTOR);
  }
  return `${PAGE_CONTENT_SELECTOR} ${trimmed}`;
}

function scopeSelectorList(selectorText: string): string {
  return splitSelectorList(selectorText)
    .map(prefixSelector)
    .filter(Boolean)
    .join(', ');
}

function scopePageCss(css: string): string {
  let output = '';
  let index = 0;
  while (index < css.length) {
    const openIndex = findNextTopLevelBrace(css, index);
    if (openIndex === -1) {
      output += css.slice(index);
      break;
    }
    const prelude = css.slice(index, openIndex).trim();
    const closeIndex = findMatchingBrace(css, openIndex);
    const body = css.slice(openIndex + 1, closeIndex);
    if (!prelude) {
      output += css.slice(index, closeIndex + 1);
    } else if (/^@(media|supports|container)\b/i.test(prelude)) {
      output += `${prelude} {${scopePageCss(body)}}`;
    } else if (/^@/i.test(prelude)) {
      output += `${prelude} {${body}}`;
    } else {
      output += `${scopeSelectorList(prelude)} {${body}}`;
    }
    index = closeIndex + 1;
  }
  return output.trim();
}

/**
 * Sanitize CSS string to remove dangerous constructs.
 * Runs on the client side as defense-in-depth (backend also sanitizes).
 */
function sanitizeCssClient(css: string): string {
  if (!css) return '';
  let clean = css;
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  // Strip @import
  clean = clean.replace(/@import\s+(?:url\s*\()?[^;{}]+;?/gi, '');
  // Strip expression()
  clean = clean.replace(/expression\s*\([^)]*\)/gi, '');
  // Strip javascript: in url()
  clean = sanitizeCssUrls(clean);
  // Strip behavior
  clean = clean.replace(/behavior\s*:\s*[^;]+;?/gi, '');
  // Strip -moz-binding
  clean = clean.replace(/-moz-binding\s*:\s*[^;]+;?/gi, '');
  return clean;
}

function sanitizeUrlAttributes(html: string): string {
  return html.replace(
    /\s+(href|src|action|poster|formaction|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match, attr: string, raw: string) => {
      const value = raw.replace(/^["']|["']$/g, '');
      const allowDataImage = /^(src|poster)$/i.test(attr);
      return isUnsafeUrl(value, allowDataImage) ? ` ${attr}=""` : match;
    },
  );
}

function sanitizeSrcsetAttributes(html: string): string {
  return html.replace(
    /\s+srcset\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (_match, raw: string) => {
      const value = raw.replace(/^["']|["']$/g, '');
      const candidates = value
        .split(',')
        .map((candidate) => candidate.trim())
        .filter((candidate) => {
          const url = candidate.split(/\s+/)[0] || '';
          return url && !isUnsafeUrl(url, true);
        });
      return candidates.length ? ` srcset="${escapeAttr(candidates.join(', '))}"` : '';
    },
  );
}

function sanitizeInlineStyles(html: string): string {
  return html.replace(
    /\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (_match, raw: string) => {
      const value = raw.replace(/^["']|["']$/g, '');
      const clean = sanitizeCssClient(value).trim();
      return clean ? ` style="${escapeAttr(clean)}"` : '';
    },
  );
}

function sanitizeHtmlInitial(html: string): string {
  if (!html) return '';
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = clean.replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = sanitizeUrlAttributes(clean);
  clean = sanitizeSrcsetAttributes(clean);
  clean = sanitizeInlineStyles(clean);
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  clean = clean.replace(/<(object|embed|applet)\b[^>]*\/?>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  clean = clean.replace(/<(link|meta|base)\b[^>]*\/?>/gi, '');
  return clean;
}

export function SafePageRenderer({ html, css, dynamicContext, analytics }: SafePageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageViewTrackedRef = useRef(false);
  const renderedHtml = neutralizeForms(pageBodyHtml(renderPageBuilderDynamicBlocks(html, dynamicContext)));
  const initialHtml = sanitizeHtmlInitial(renderedHtml);
  const cleanCss = scopePageCss(sanitizeCssClient(css));

  useEffect(() => {
    pageViewTrackedRef.current = false;
  }, [analytics?.pageId]);

  useEffect(() => {
    if (pageViewTrackedRef.current) return;
    if (!analytics?.enabled) return;
    pageViewTrackedRef.current = true;
    void trackPageBuilderEvent(analytics, 'page_view');
  }, [analytics]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cleanHtml = DOMPurify.sanitize(sanitizeHtmlInitial(renderedHtml), PURIFY_CONFIG);

    // Inject sanitized content
    containerRef.current.innerHTML = '';

    if (cleanCss) {
      const styleEl = document.createElement('style');
      styleEl.textContent = cleanCss;
      containerRef.current.appendChild(styleEl);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'gjs-page-content';
    contentDiv.innerHTML = cleanHtml;
    containerRef.current.appendChild(contentDiv);
  }, [cleanCss, renderedHtml]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !analytics?.enabled) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || !root.contains(anchor)) return;

      const explicitType = anchor.getAttribute('data-pd-analytics');
      const productHost = anchor.closest<HTMLElement>('[data-pd-product-id]');
      const productId = anchor.getAttribute('data-pd-product-id') || productHost?.getAttribute('data-pd-product-id') || undefined;
      const href = anchor.getAttribute('href') || '';
      const eventType = resolvePageBuilderAnalyticsEventType({ explicitType, productId, href });

      void trackPageBuilderEvent(analytics, eventType, {
        productId,
        targetUrl: href,
        targetLabel: anchor.textContent || anchor.getAttribute('aria-label') || anchor.getAttribute('title') || undefined,
      });
    };

    root.addEventListener('click', handleClick);
    return () => root.removeEventListener('click', handleClick);
  }, [analytics]);

  return (
    <div ref={containerRef} suppressHydrationWarning>
      {cleanCss ? <style>{cleanCss}</style> : null}
      <div className="gjs-page-content" dangerouslySetInnerHTML={{ __html: initialHtml }} />
    </div>
  );
}
