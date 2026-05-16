export interface SubscriptionPlanLimits {
  plan_id: string;
  max_products: number;
  max_images_per_product: number;
  max_page_builder_pages: number;
  has_ai_seo: boolean;
  has_image_compression: boolean;
  has_custom_domain: boolean;
  has_page_builder: boolean;
  has_direct_payment: boolean;
  has_white_label: boolean;
  has_own_ai_provider: boolean;
  commission_rate: number;
  ai_tokens_included: number;
  yearly_price: number;
  is_enabled?: boolean;
}

export interface DisplayPlan extends SubscriptionPlanLimits {
  id: string;
  name: string;
  price: string;
  period: string;
  commission: string;
  products: string;
  images: string;
  domain: boolean;
  ai: boolean;
  builder: boolean;
  directPay: boolean;
  apiKeys: boolean;
  whiteLabel: boolean;
  support: string;
  description: string;
  features: string[];
  notIncluded: string[];
  highlight: boolean;
  cta: string;
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free: 'Idéal pour tester la plateforme',
  starter: 'Pour les petits vendeurs',
  regular: 'Pour les vendeurs établis',
  agency: 'Pour les agences multi-marques',
  pro: 'Pour le commerce sérieux',
  golden: 'Pour les grandes enseignes',
  platinum: 'White Label — votre marque',
};

const SUPPORT_LABELS: Record<string, string> = {
  free: 'Forum',
  starter: 'Email',
  regular: 'Email',
  agency: 'Prioritaire',
  pro: 'Dédié',
  golden: 'Dédié',
  platinum: 'Dédié',
};

const PLAN_ORDER = ['free', 'starter', 'regular', 'agency', 'pro', 'golden', 'platinum'];

function toNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function labelFromPlanId(planId: string): string {
  return planId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Plan';
}

function formatLimit(value: number, label: string): string {
  return value === -1 ? `${label} illimités` : `${value.toLocaleString('fr-TN')} ${label}`;
}

function formatPrice(value: number): string {
  return value.toLocaleString('fr-TN', { maximumFractionDigits: 0 });
}

function formatCommission(value: number): string {
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toLocaleString('fr-TN', { maximumFractionDigits: 2 })}%`;
}

function planRank(planId: string): number {
  const index = PLAN_ORDER.indexOf(planId);
  return index >= 0 ? index : PLAN_ORDER.length;
}

export function normalizeSubscriptionPlan(raw: Record<string, unknown>): SubscriptionPlanLimits {
  const commissionRate = toNumber(raw.commission_rate);
  return {
    plan_id: String(raw.plan_id || ''),
    max_products: toNumber(raw.max_products),
    max_images_per_product: toNumber(raw.max_images_per_product),
    max_page_builder_pages: toNumber(raw.max_page_builder_pages),
    has_ai_seo: Boolean(raw.has_ai_seo),
    has_image_compression: Boolean(raw.has_image_compression),
    has_custom_domain: Boolean(raw.has_custom_domain),
    has_page_builder: Boolean(raw.has_page_builder),
    has_direct_payment: Boolean(raw.has_direct_payment),
    has_white_label: Boolean(raw.has_white_label),
    has_own_ai_provider: Boolean(raw.has_own_ai_provider),
    commission_rate: commissionRate <= 1 ? Number((commissionRate * 100).toFixed(2)) : commissionRate,
    ai_tokens_included: toNumber(raw.ai_tokens_included),
    yearly_price: toNumber(raw.yearly_price),
    is_enabled: raw.is_enabled !== false,
  };
}

export function toDisplayPlan(plan: SubscriptionPlanLimits, highlightPlanId = 'pro'): DisplayPlan {
  const name = labelFromPlanId(plan.plan_id);
  const features = [
    formatLimit(plan.max_products, 'produits'),
    `${plan.max_images_per_product} images/produit`,
    'Sous-domaine gratuit',
  ];
  const notIncluded: string[] = [];

  if (plan.has_custom_domain) features.push('Domaine custom');
  else notIncluded.push('Domaine custom');

  if (plan.has_ai_seo) features.push(plan.ai_tokens_included === -1 ? 'IA illimitée' : 'Outils IA');
  else notIncluded.push('Outils IA');

  if (plan.has_own_ai_provider) features.push('Clé IA vendeur');

  if (plan.has_page_builder) features.push(formatLimit(plan.max_page_builder_pages, 'pages builder'));
  else notIncluded.push('Page Builder');

  if (plan.has_direct_payment) features.push('Paiement direct');
  else notIncluded.push('Paiement direct');

  if (plan.has_white_label) features.push('White Label');
  else notIncluded.push('White Label');

  return {
    ...plan,
    id: plan.plan_id,
    name,
    price: formatPrice(plan.yearly_price),
    period: plan.yearly_price > 0 ? '/an' : '',
    commission: formatCommission(plan.commission_rate),
    products: plan.max_products === -1 ? '∞' : plan.max_products.toLocaleString('fr-TN'),
    images: plan.max_images_per_product.toLocaleString('fr-TN'),
    domain: plan.has_custom_domain,
    ai: plan.has_ai_seo,
    builder: plan.has_page_builder,
    directPay: plan.has_direct_payment,
    apiKeys: plan.has_page_builder,
    whiteLabel: plan.has_white_label,
    support: SUPPORT_LABELS[plan.plan_id] || (plan.yearly_price > 0 ? 'Email' : 'Forum'),
    description: PLAN_DESCRIPTIONS[plan.plan_id] || 'Plan personnalisable',
    features,
    notIncluded,
    highlight: plan.plan_id === highlightPlanId,
    cta: plan.yearly_price === 0 ? 'Commencer gratuitement' : `Choisir ${name}`,
  };
}

export async function fetchEnabledSubscriptionPlans(baseUrl = ''): Promise<DisplayPlan[]> {
  try {
    const res = await fetch(`${baseUrl}/api/pd/subscriptions/plans`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    const rows: Record<string, unknown>[] = Array.isArray(data.plans) ? data.plans : [];
    return rows
      .map((row: Record<string, unknown>) => normalizeSubscriptionPlan(row))
      .filter((plan) => plan.is_enabled)
      .sort((a, b) => planRank(a.plan_id) - planRank(b.plan_id) || a.yearly_price - b.yearly_price || a.plan_id.localeCompare(b.plan_id))
      .map((plan) => toDisplayPlan(plan));
  } catch {
    return [];
  }
}
