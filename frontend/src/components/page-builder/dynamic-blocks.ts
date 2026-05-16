import { normalizePublicAssetUrl } from '../../lib/public-assets';

export interface PageBuilderStoreProduct {
  id: string;
  title: string;
  slug?: string | null;
  price: number | string;
  thumbnail?: string | null;
  images?: Array<string | { url: string }>;
  category?: string | null;
  marketplace_category_name?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_name?: string | null;
  storefront_category_slug?: string | null;
  storefront_parent_category_slug?: string | null;
}

export interface PageBuilderDynamicContext {
  storeName: string;
  storeDescription?: string | null;
  storePathBase?: string;
  primaryColor?: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  shippingMode?: string | null;
  shippingPolicy?: string | null;
  returnsPolicy?: string | null;
  paymentPolicy?: string | null;
  products?: PageBuilderStoreProduct[];
}

type BlockAttributes = Record<string, string>;

interface DynamicBlockNode {
  start: number;
  openEnd: number;
  end: number;
  tagName: string;
  attrs: BlockAttributes;
  blockType: string;
  children: DynamicBlockNode[];
}

const TAG_PATTERN = /<\/?([a-z][\w:-]*)\b[^>]*>/gi;
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

function parseAttributes(input: string): BlockAttributes {
  const attrs: BlockAttributes = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function openingTagParts(tagText: string): { tagName: string; attrs: BlockAttributes; selfClosing: boolean } | null {
  const match = /^<\s*([a-z][\w:-]*)\b([\s\S]*?)\/?\s*>$/i.exec(tagText);
  if (!match) return null;
  const tagName = match[1].toLowerCase();
  return {
    tagName,
    attrs: parseAttributes(match[2] || ''),
    selfClosing: /\/\s*>$/.test(tagText) || VOID_TAGS.has(tagName),
  };
}

function collectDynamicBlockNodes(html: string): DynamicBlockNode[] {
  const roots: DynamicBlockNode[] = [];
  const stack: Array<{ tagName: string; node?: DynamicBlockNode }> = [];
  let match: RegExpExecArray | null;
  TAG_PATTERN.lastIndex = 0;

  while ((match = TAG_PATTERN.exec(html)) !== null) {
    const tagText = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = /^<\s*\//.test(tagText);

    if (isClosing) {
      const closeIndex = stack.findLastIndex((entry) => entry.tagName === tagName);
      if (closeIndex === -1) continue;
      const entry = stack[closeIndex];
      if (entry.node) entry.node.end = match.index + tagText.length;
      stack.length = closeIndex;
      continue;
    }

    const parts = openingTagParts(tagText);
    if (!parts) continue;
    const blockType = parts.attrs['data-pd-block']?.trim();
    const parent = stack.findLast((entry) => entry.node)?.node;
    const node = blockType
      ? {
          start: match.index,
          openEnd: match.index + tagText.length,
          end: parts.selfClosing ? match.index + tagText.length : 0,
          tagName: parts.tagName,
          attrs: parts.attrs,
          blockType,
          children: [],
        }
      : undefined;

    if (node) {
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    if (!parts.selfClosing) {
      stack.push({ tagName: parts.tagName, node });
    }
  }

  return roots.filter((node) => node.end > node.start);
}

function parseLimit(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

function slugSegment(value?: string | null): string {
  return (value || 'non-categorized-products')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'non-categorized-products';
}

function parseProductIds(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseCategorySlugs(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((slug) => slugSegment(slug))
    .filter(Boolean);
}

function getProductImage(product: PageBuilderStoreProduct): string {
  const firstImage = product.images?.[0];
  const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
  return normalizePublicAssetUrl(imageUrl || product.thumbnail || '');
}

function safeImageUrl(value?: string | null): string {
  const normalized = normalizePublicAssetUrl(value || '');
  if (!normalized) return '';
  if (normalized.startsWith('/')) return normalized;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? normalized : '';
  } catch {
    return '';
  }
}

const HERO_IMAGE_POSITIONS = new Set([
  'left top',
  'center top',
  'right top',
  'left center',
  'center center',
  'right center',
  'left bottom',
  'center bottom',
  'right bottom',
]);

function heroImagePosition(value?: string | null): string {
  const normalized = value?.trim().toLowerCase();
  const percentMatch = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(normalized || '');
  if (percentMatch) {
    const x = Math.min(100, Math.max(0, Number(percentMatch[1])));
    const y = Math.min(100, Math.max(0, Number(percentMatch[2])));
    return `${x}% ${y}%`;
  }
  return normalized && HERO_IMAGE_POSITIONS.has(normalized) ? normalized : 'center center';
}

function heroImageFit(value?: string | null): 'cover' | 'contain' {
  return value?.trim().toLowerCase() === 'contain' ? 'contain' : 'cover';
}

function formatPrice(price: PageBuilderStoreProduct['price']): string {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

function productPath(product: PageBuilderStoreProduct, storePathBase = ''): string {
  const normalizedBase = storePathBase.replace(/\/$/, '');
  const categorySegments = normalizedBase
    ? [slugSegment(product.marketplace_category_slug || product.category)]
    : [product.storefront_parent_category_slug, product.storefront_category_slug || product.category]
        .filter(Boolean)
        .map((segment) => slugSegment(segment));
  const segments = ['products', ...(categorySegments.length ? categorySegments : ['non-categorized-products']), slugSegment(product.slug || product.title || product.id)];
  return `${normalizedBase}/${segments.map(encodeURIComponent).join('/')}`;
}

function blockTitle(attrs: BlockAttributes, fallback: string): string {
  return attrs['data-pd-title']?.trim() || fallback;
}

function blockSubtitle(attrs: BlockAttributes, fallback: string): string {
  return attrs['data-pd-subtitle']?.trim() || fallback;
}

function primaryColor(context: PageBuilderDynamicContext): string {
  return context.primaryColor || '#16C784';
}

function shippingModeLabel(mode?: string | null): string {
  return mode === 'platform_unified' ? 'Livraison unifiée PandaMarket' : 'Livraison gérée par la boutique';
}

function shippingModeDescription(mode?: string | null): string {
  return mode === 'platform_unified'
    ? 'La boutique utilise les intégrations PandaMarket pour organiser la livraison, les bordereaux et le suivi quand ils sont disponibles.'
    : 'La boutique organise directement la préparation, la livraison et le suivi avec le client après confirmation de la commande.';
}

function filterProducts(products: PageBuilderStoreProduct[], attrs: BlockAttributes): PageBuilderStoreProduct[] {
  const selectedProductIds = parseProductIds(attrs['data-pd-product-ids']);
  if (selectedProductIds.length > 0) {
    const byId = new Map(products.map((product) => [product.id, product]));
    return selectedProductIds
      .map((id) => byId.get(id))
      .filter((product): product is PageBuilderStoreProduct => Boolean(product));
  }
  const category = attrs['data-pd-category']?.trim();
  if (!category) return products;
  const normalized = slugSegment(category);
  return products.filter((product) => [
    product.category,
    product.marketplace_category_name,
    product.marketplace_category_slug,
    product.storefront_category_name,
    product.storefront_category_slug,
    product.storefront_parent_category_slug,
  ].some((value) => slugSegment(value) === normalized));
}

function renderProductGrid(attrs: BlockAttributes, context: PageBuilderDynamicContext, variant: 'grid' | 'featured' = 'grid'): string {
  const color = primaryColor(context);
  const limit = parseLimit(attrs['data-pd-limit'], variant === 'featured' ? 4 : 8, 12);
  const products = filterProducts(context.products || [], attrs).slice(0, limit);
  const title = blockTitle(attrs, variant === 'featured' ? 'Produits sélectionnés' : 'Nos produits');
  const subtitle = attrs['data-pd-subtitle'] || 'Découvrez les articles disponibles dans cette boutique.';
  const cards = products.map((product) => {
    const image = getProductImage(product);
    const href = productPath(product, context.storePathBase);
    return `
      <a href="${escapeAttr(href)}" data-pd-analytics="product_click" data-pd-product-id="${escapeAttr(product.id)}" style="display:block;border:1px solid #E5E7EB;border-radius:18px;overflow:hidden;background:#fff;text-decoration:none;color:inherit;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
        <div style="aspect-ratio:1;background:#F3F4F6;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(product.title)}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="font-size:13px;color:#9CA3AF;">Image produit</span>`}
        </div>
        <div style="padding:16px;">
          <h3 style="font-size:16px;font-weight:750;margin:0 0 8px;color:#111827;line-height:1.35;">${escapeHtml(product.title)}</h3>
          <p style="font-size:14px;font-weight:800;margin:0;color:${escapeAttr(color)};">${escapeHtml(formatPrice(product.price))}</p>
        </div>
      </a>`;
  }).join('');

  return `
    <section data-pd-rendered-block="product-grid" style="padding:56px 24px;max-width:1200px;margin:0 auto;">
      <div style="display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:28px;flex-wrap:wrap;">
        <div>
          <h2 style="font-size:clamp(28px,4vw,42px);font-weight:850;letter-spacing:-0.04em;margin:0 0 8px;color:#111827;">${escapeHtml(title)}</h2>
          <p style="font-size:16px;color:#6B7280;margin:0;max-width:620px;">${escapeHtml(subtitle)}</p>
        </div>
        <a href="${escapeAttr(`${(context.storePathBase || '').replace(/\/$/, '')}/products`)}" data-pd-analytics="cta_click" style="display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;border-radius:999px;background:${escapeAttr(color)};color:white;font-weight:800;text-decoration:none;">Voir tout</a>
      </div>
      ${products.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:22px;">${cards}</div>` : `<div style="border:1px dashed #D1D5DB;border-radius:18px;padding:32px;text-align:center;color:#6B7280;background:#F9FAFB;">Aucun produit publié pour le moment.</div>`}
    </section>`;
}

function deriveCategories(products: PageBuilderStoreProduct[]) {
  const categories = new Map<string, { slug: string; name: string; count: number; image: string }>();
  for (const product of products) {
    const slug = slugSegment(product.storefront_category_slug || product.marketplace_category_slug || product.category);
    const name = product.storefront_category_name || product.marketplace_category_name || product.category || 'Collection';
    const current = categories.get(slug);
    if (current) {
      current.count += 1;
      if (!current.image) current.image = getProductImage(product);
      continue;
    }
    categories.set(slug, { slug, name, count: 1, image: getProductImage(product) });
  }
  return [...categories.values()];
}

function renderCategoryShowcase(attrs: BlockAttributes, context: PageBuilderDynamicContext): string {
  const color = primaryColor(context);
  const title = blockTitle(attrs, 'Collections de la boutique');
  const selectedCategorySlugs = parseCategorySlugs(attrs['data-pd-category-slugs']);
  const availableCategories = deriveCategories(context.products || []);
  const categories = (
    selectedCategorySlugs.length
      ? selectedCategorySlugs
          .map((slug) => availableCategories.find((category) => category.slug === slug))
          .filter((category): category is { slug: string; name: string; count: number; image: string } => Boolean(category))
      : availableCategories
  ).slice(0, parseLimit(attrs['data-pd-limit'], 6, 12));
  const base = (context.storePathBase || '').replace(/\/$/, '');
  const cards = categories.map((category) => `
    <a href="${escapeAttr(`${base}/products?category=${encodeURIComponent(category.slug)}`)}" style="display:block;position:relative;min-height:180px;border-radius:22px;overflow:hidden;text-decoration:none;color:white;background:#111827;box-shadow:0 16px 40px rgba(15,23,42,0.16);">
      ${category.image ? `<img src="${escapeAttr(category.image)}" alt="${escapeAttr(category.name)}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.58;" />` : ''}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(17,24,39,.08),rgba(17,24,39,.72));"></div>
      <div style="position:absolute;left:18px;right:18px;bottom:18px;">
        <h3 style="font-size:20px;font-weight:850;margin:0 0 6px;">${escapeHtml(category.name)}</h3>
        <p style="font-size:13px;margin:0;color:rgba(255,255,255,.82);">${category.count} produit${category.count > 1 ? 's' : ''}</p>
      </div>
    </a>`).join('');

  return `
    <section data-pd-rendered-block="category-showcase" style="padding:56px 24px;background:#F9FAFB;">
      <div style="max-width:1200px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:30px;">
          <p style="margin:0 0 8px;color:${escapeAttr(color)};font-weight:850;text-transform:uppercase;letter-spacing:.12em;font-size:12px;">Collections</p>
          <h2 style="font-size:clamp(28px,4vw,42px);font-weight:850;letter-spacing:-0.04em;margin:0;color:#111827;">${escapeHtml(title)}</h2>
        </div>
        ${categories.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px;">${cards}</div>` : `<div style="border:1px dashed #D1D5DB;border-radius:18px;padding:32px;text-align:center;color:#6B7280;background:white;">Aucune collection disponible pour le moment.</div>`}
      </div>
    </section>`;
}

function renderStoreHero(attrs: BlockAttributes, context: PageBuilderDynamicContext): string {
  const color = primaryColor(context);
  const logo = safeImageUrl(context.logoUrl);
  const image = safeImageUrl(attrs['data-pd-image-url']);
  const imagePosition = heroImagePosition(attrs['data-pd-image-position']);
  const imageFit = heroImageFit(attrs['data-pd-image-fit']);
  const title = blockTitle(attrs, context.storeName);
  const subtitle = attrs['data-pd-subtitle'] || context.storeDescription || `Découvrez les produits de ${context.storeName}.`;
  const base = (context.storePathBase || '').replace(/\/$/, '');
  const background = image
    ? `background-image:linear-gradient(135deg,rgba(15,23,42,.88),rgba(17,24,39,.74),rgba(22,199,132,.56)),url('${escapeAttr(image)}');background-position:center center,${escapeAttr(imagePosition)};background-size:cover,${imageFit};background-repeat:no-repeat,no-repeat`
    : `linear-gradient(135deg,#0F172A 0%,#111827 52%,${escapeAttr(color)} 140%)`;
  return `
    <section data-pd-rendered-block="store-hero" style="padding:86px 24px;text-align:center;${image ? background : `background:${background}`};color:white;">
      <div style="max-width:900px;margin:0 auto;">
        ${logo ? `<img src="${escapeAttr(logo)}" alt="${escapeAttr(context.storeName)}" style="height:72px;max-width:220px;object-fit:contain;margin:0 auto 24px;" />` : ''}
        <h1 style="font-size:clamp(40px,7vw,76px);font-weight:900;letter-spacing:-0.06em;line-height:.98;margin:0 0 18px;">${escapeHtml(title)}</h1>
        <p style="font-size:clamp(17px,2vw,22px);line-height:1.65;color:rgba(255,255,255,.78);max-width:720px;margin:0 auto 34px;">${escapeHtml(subtitle)}</p>
        <a href="${escapeAttr(`${base}/products`)}" data-pd-analytics="cta_click" style="display:inline-flex;align-items:center;justify-content:center;padding:15px 28px;border-radius:999px;background:${escapeAttr(color)};color:white;font-weight:850;text-decoration:none;box-shadow:0 18px 42px rgba(22,199,132,.28);">Explorer la boutique</a>
      </div>
    </section>`;
}

function renderStoreContact(attrs: BlockAttributes, context: PageBuilderDynamicContext): string {
  const color = primaryColor(context);
  const title = blockTitle(attrs, 'Contactez la boutique');
  const address = [context.address, context.city, context.country].filter(Boolean).join(', ');
  const items = [
    context.contactEmail ? ['Email', context.contactEmail, `mailto:${context.contactEmail}`] : null,
    context.contactPhone ? ['Téléphone', context.contactPhone, `tel:${context.contactPhone}`] : null,
    address ? ['Adresse', address, null] : null,
  ].filter(Boolean) as Array<[string, string, string | null]>;

  return `
    <section data-pd-rendered-block="store-contact" style="padding:56px 24px;max-width:980px;margin:0 auto;">
      <div style="border:1px solid #E5E7EB;border-radius:28px;padding:clamp(26px,5vw,48px);background:white;box-shadow:0 18px 55px rgba(15,23,42,0.08);">
        <p style="margin:0 0 8px;color:${escapeAttr(color)};font-weight:850;text-transform:uppercase;letter-spacing:.12em;font-size:12px;">${escapeHtml(context.storeName)}</p>
        <h2 style="font-size:clamp(28px,4vw,42px);font-weight:850;letter-spacing:-0.04em;margin:0 0 12px;color:#111827;">${escapeHtml(title)}</h2>
        <p style="font-size:16px;color:#6B7280;margin:0 0 28px;">Une question sur un produit, une livraison ou une commande ? Contactez directement la boutique.</p>
        ${items.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">${items.map(([label, value, href]) => `<div style="border:1px solid #EEF2F7;border-radius:18px;padding:18px;background:#F9FAFB;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#6B7280;margin:0 0 8px;">${escapeHtml(label)}</p>${href ? `<a href="${escapeAttr(href)}" style="color:${escapeAttr(color)};font-weight:800;text-decoration:none;">${escapeHtml(value)}</a>` : `<p style="color:#111827;font-weight:700;margin:0;">${escapeHtml(value)}</p>`}</div>`).join('')}</div>` : `<div style="border:1px dashed #D1D5DB;border-radius:18px;padding:24px;color:#6B7280;background:#F9FAFB;">Les informations de contact de la boutique ne sont pas encore configurées.</div>`}
      </div>
    </section>`;
}

function renderShippingPolicy(attrs: BlockAttributes, context: PageBuilderDynamicContext): string {
  const color = primaryColor(context);
  const title = blockTitle(attrs, 'Livraison');
  const subtitle = blockSubtitle(attrs, 'Informations de préparation, livraison et suivi pour cette boutique.');
  const policy = context.shippingPolicy || shippingModeDescription(context.shippingMode);
  return `
    <section data-pd-rendered-block="shipping-policy" style="padding:56px 24px;background:#F9FAFB;">
      <div style="max-width:980px;margin:0 auto;border:1px solid #E5E7EB;border-radius:28px;background:white;padding:clamp(26px,5vw,46px);box-shadow:0 18px 55px rgba(15,23,42,0.06);">
        <p style="margin:0 0 8px;color:${escapeAttr(color)};font-weight:850;text-transform:uppercase;letter-spacing:.12em;font-size:12px;">${escapeHtml(shippingModeLabel(context.shippingMode))}</p>
        <h2 style="font-size:clamp(28px,4vw,42px);font-weight:850;letter-spacing:-0.04em;margin:0 0 12px;color:#111827;">${escapeHtml(title)}</h2>
        <p style="font-size:16px;color:#6B7280;line-height:1.7;margin:0 0 22px;">${escapeHtml(subtitle)}</p>
        <div style="border-left:4px solid ${escapeAttr(color)};padding:16px 18px;background:#F9FAFB;border-radius:14px;color:#374151;line-height:1.75;">${escapeHtml(policy)}</div>
      </div>
    </section>`;
}

function renderPaymentPolicy(attrs: BlockAttributes, context: PageBuilderDynamicContext): string {
  const color = primaryColor(context);
  const title = blockTitle(attrs, 'Paiement sécurisé');
  const subtitle = blockSubtitle(attrs, 'Les modes de paiement disponibles sont présentés au checkout selon le type de produits commandés.');
  const policy = context.paymentPolicy || 'Paiement en ligne via Flouci ou Konnect, Mandat Minute, et paiement à la livraison pour les produits physiques éligibles.';
  const methods = [
    ['Flouci', 'Paiement sécurisé par carte bancaire ou wallet.'],
    ['Konnect', 'Paiement en ligne via le réseau Konnect.'],
    ['Mandat Minute', 'Paiement hors ligne avec justificatif.'],
    ['Cash on Delivery', 'Paiement à la livraison pour les commandes physiques éligibles.'],
  ];
  return `
    <section data-pd-rendered-block="payment-policy" style="padding:56px 24px;max-width:1100px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:28px;">
        <p style="margin:0 0 8px;color:${escapeAttr(color)};font-weight:850;text-transform:uppercase;letter-spacing:.12em;font-size:12px;">Paiement</p>
        <h2 style="font-size:clamp(28px,4vw,42px);font-weight:850;letter-spacing:-0.04em;margin:0 0 12px;color:#111827;">${escapeHtml(title)}</h2>
        <p style="font-size:16px;color:#6B7280;line-height:1.7;margin:0 auto;max-width:680px;">${escapeHtml(subtitle)}</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-bottom:18px;">
        ${methods.map(([name, desc]) => `<div style="border:1px solid #E5E7EB;border-radius:18px;padding:18px;background:white;box-shadow:0 10px 28px rgba(15,23,42,0.05);"><h3 style="margin:0 0 8px;color:#111827;font-size:16px;font-weight:850;">${escapeHtml(name)}</h3><p style="margin:0;color:#6B7280;font-size:13px;line-height:1.55;">${escapeHtml(desc)}</p></div>`).join('')}
      </div>
      <div style="border:1px dashed #CBD5E1;border-radius:18px;padding:20px;background:#F8FAFC;color:#475569;line-height:1.7;text-align:center;">${escapeHtml(policy)}</div>
    </section>`;
}

function renderStorePolicies(attrs: BlockAttributes, context: PageBuilderDynamicContext): string {
  const color = primaryColor(context);
  const title = blockTitle(attrs, 'Politiques de la boutique');
  const subtitle = blockSubtitle(attrs, 'Les informations essentielles avant de commander.');
  const shipping = context.shippingPolicy || shippingModeDescription(context.shippingMode);
  const returns = context.returnsPolicy || 'Pour toute demande de retour ou d’échange, contactez la boutique avec votre numéro de commande afin de vérifier les conditions applicables.';
  const payment = context.paymentPolicy || 'Les paiements disponibles sont confirmés au checkout selon le type de produits et la configuration de la commande.';
  const items = [
    ['Livraison', shipping],
    ['Retours & échanges', returns],
    ['Paiement', payment],
  ];
  return `
    <section data-pd-rendered-block="store-policies" style="padding:64px 24px;background:linear-gradient(180deg,#FFFFFF,#F9FAFB);">
      <div style="max-width:1180px;margin:0 auto;">
        <div style="max-width:760px;margin:0 auto 30px;text-align:center;">
          <p style="margin:0 0 8px;color:${escapeAttr(color)};font-weight:850;text-transform:uppercase;letter-spacing:.12em;font-size:12px;">Confiance</p>
          <h2 style="font-size:clamp(28px,4vw,42px);font-weight:850;letter-spacing:-0.04em;margin:0 0 12px;color:#111827;">${escapeHtml(title)}</h2>
          <p style="font-size:16px;color:#6B7280;line-height:1.7;margin:0;">${escapeHtml(subtitle)}</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;">
          ${items.map(([name, body]) => `<article style="border:1px solid #E5E7EB;border-radius:22px;padding:24px;background:white;box-shadow:0 14px 36px rgba(15,23,42,0.06);"><h3 style="margin:0 0 10px;color:#111827;font-size:18px;font-weight:850;">${escapeHtml(name)}</h3><p style="margin:0;color:#6B7280;font-size:14px;line-height:1.7;">${escapeHtml(body)}</p></article>`).join('')}
        </div>
      </div>
    </section>`;
}

function renderDynamicBlock(blockType: string, attrs: BlockAttributes, context: PageBuilderDynamicContext): string | null {
  switch (blockType.toLowerCase()) {
    case 'store-hero':
      return renderStoreHero(attrs, context);
    case 'product-grid':
      return renderProductGrid(attrs, context);
    case 'featured-products':
      return renderProductGrid(attrs, context, 'featured');
    case 'category-showcase':
      return renderCategoryShowcase(attrs, context);
    case 'store-contact':
      return renderStoreContact(attrs, context);
    case 'shipping-policy':
      return renderShippingPolicy(attrs, context);
    case 'payment-policy':
      return renderPaymentPolicy(attrs, context);
    case 'store-policies':
      return renderStorePolicies(attrs, context);
    default:
      return null;
  }
}

function renderDynamicBlockNode(node: DynamicBlockNode, context: PageBuilderDynamicContext): string | null {
  const rendered = renderDynamicBlock(node.blockType, node.attrs, context);
  if (!rendered) return null;
  const nestedRendered = node.children
    .map((child) => renderDynamicBlockNode(child, context))
    .filter((child): child is string => Boolean(child))
    .join('');
  return `${rendered}${nestedRendered}`;
}

export function renderPageBuilderDynamicBlocks(html: string, context?: PageBuilderDynamicContext): string {
  if (!html || !context) return html || '';
  const roots = collectDynamicBlockNodes(html);
  if (!roots.length) return html;

  let renderedHtml = html;
  for (const node of [...roots].reverse()) {
    const rendered = renderDynamicBlockNode(node, context);
    if (!rendered) continue;
    renderedHtml = `${renderedHtml.slice(0, node.start)}${rendered}${renderedHtml.slice(node.end)}`;
  }
  return renderedHtml;
}
