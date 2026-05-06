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

interface SafePageRendererProps {
  html: string;
  css: string;
}

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

/**
 * Sanitize CSS string to remove dangerous constructs.
 * Runs on the client side as defense-in-depth (backend also sanitizes).
 */
function sanitizeCssClient(css: string): string {
  if (!css) return '';
  let clean = css;
  // Strip @import
  clean = clean.replace(/@import\s+[^;]+;/gi, '');
  // Strip expression()
  clean = clean.replace(/expression\s*\([^)]*\)/gi, '');
  // Strip javascript: in url()
  clean = clean.replace(/url\s*\(\s*(['"]?)javascript:[^)]*\1\s*\)/gi, 'url()');
  // Strip behavior
  clean = clean.replace(/behavior\s*:\s*[^;]+;?/gi, '');
  // Strip -moz-binding
  clean = clean.replace(/-moz-binding\s*:\s*[^;]+;?/gi, '');
  return clean;
}

export function SafePageRenderer({ html, css }: SafePageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Sanitize HTML with DOMPurify
    const cleanHtml = DOMPurify.sanitize(html, PURIFY_CONFIG);

    // Sanitize CSS
    const cleanCss = sanitizeCssClient(css);

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
  }, [html, css]);

  return <div ref={containerRef} />;
}
