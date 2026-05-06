'use client';

import { useState } from 'react';
import { Store, Check, ArrowRight, Shield, Globe, Palette, Bot, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    period: '',
    commission: '15%',
    description: 'Idéal pour tester la plateforme',
    features: ['10 produits', '2 images/produit', 'Sous-domaine gratuit', 'Hub central'],
    notIncluded: ['Domaine custom', 'Outils IA', 'Page Builder', 'Paiement direct', 'API/Webhooks'],
    highlight: false,
    cta: 'Commencer gratuitement',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '300',
    period: '/an',
    commission: '0%',
    description: 'Pour les petits vendeurs',
    features: ['50 produits', '5 images/produit', 'Sous-domaine gratuit', 'Domaine custom', 'IA basique', 'Support email'],
    notIncluded: ['Page Builder', 'Paiement direct', 'API/Webhooks'],
    highlight: false,
    cta: 'Choisir Starter',
  },
  {
    id: 'regular',
    name: 'Regular',
    price: '600',
    period: '/an',
    commission: '0%',
    description: 'Pour les vendeurs établis',
    features: ['100 produits', '7 images/produit', 'Domaine custom', 'IA basique', 'Page Builder', 'Support email'],
    notIncluded: ['Paiement direct', 'API/Webhooks'],
    highlight: false,
    cta: 'Choisir Regular',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '1 200',
    period: '/an',
    commission: '0%',
    description: 'Pour les agences multi-marques',
    features: ['300 produits', '10 images/produit', 'Domaine custom', 'IA avancée', 'Page Builder', 'API/Webhooks', 'Support prioritaire'],
    notIncluded: ['Paiement direct'],
    highlight: false,
    cta: 'Choisir Agency',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '2 400',
    period: '/an',
    commission: '0%',
    description: 'Pour le commerce sérieux',
    features: ['Produits illimités', '15 images/produit', 'Domaine custom', 'IA illimitée', 'Page Builder', 'Paiement direct', 'API/Webhooks', 'Support dédié'],
    notIncluded: [],
    highlight: true,
    cta: 'Choisir Pro',
  },
  {
    id: 'golden',
    name: 'Golden',
    price: '4 800',
    period: '/an',
    commission: '0%',
    description: 'Pour les grandes enseignes',
    features: ['Produits illimités', '20 images/produit', 'Domaine custom', 'IA illimitée', 'Page Builder', 'Paiement direct', 'API/Webhooks', 'Support dédié'],
    notIncluded: [],
    highlight: false,
    cta: 'Choisir Golden',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: '9 600',
    period: '/an',
    commission: '0%',
    description: 'White Label — votre marque',
    features: ['Produits illimités', '30 images/produit', 'Domaine custom + White Label', 'IA premium', 'Page Builder', 'Paiement direct', 'API/Webhooks', 'Support dédié'],
    notIncluded: [],
    highlight: false,
    cta: 'Choisir Platinum',
  },
];

const benefits = [
  { icon: Store, title: 'Votre boutique en ligne', desc: 'Sous-domaine gratuit + domaine personnalisable' },
  { icon: Globe, title: 'Visibilité Hub', desc: 'Vos produits visibles sur le marketplace central' },
  { icon: CreditCard, title: 'Paiements locaux', desc: 'Flouci, Konnect, Mandat Minute, COD' },
  { icon: Bot, title: 'Outils IA', desc: 'SEO automatique et compression d\'images' },
  { icon: Palette, title: 'Thèmes personnalisables', desc: '3 thèmes gratuits + Page Builder' },
  { icon: Shield, title: 'Sécurisé', desc: 'SSL automatique, paiements sécurisés' },
];

export default function VendorSignupPage() {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const { settings, classes, isAliExpress } = useMarketplaceTheme();
  const marketplaceName = settings.marketplace_name || 'PandaMarket';
  const accentText = isAliExpress ? 'text-[#ff8a00]' : 'text-[#16C784]';
  const selectedCardClass = `${classes.primaryBorder} shadow-lg ${isAliExpress ? 'shadow-orange-900/10' : 'shadow-[#16C784]/10'}`;
  const popularRingClass = isAliExpress ? 'ring-2 ring-[#ff4747]' : 'ring-2 ring-[#16C784]';

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      {/* Hero */}
      <div className={`relative overflow-hidden ${classes.header}`}>
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
          Vendez sur <span className={accentText}>{marketplaceName}</span>
        </h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
          Créez votre boutique en ligne en quelques minutes. Rejoignez des centaines de vendeurs tunisiens.
        </p>
        <Link
          href="/register"
          className={`inline-flex items-center px-6 py-3 text-white rounded-full transition-all text-lg font-black shadow-lg hover:scale-[1.02] ${classes.primaryGradient}`}
        >
          Créer ma boutique <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
        </div>

      {/* Benefits */}
      <div className="relative max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {benefits.map((b) => (
            <div key={b.title} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <b.icon className={`w-8 h-8 ${accentText} mb-2`} />
              <h3 className="text-white font-semibold text-sm">{b.title}</h3>
              <p className="text-gray-400 text-xs mt-1">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Plans */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Choisissez votre plan</h2>
          <p className="text-gray-500 text-center mb-12">Commencez gratuitement, évoluez à votre rythme.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.slice(0, 4).map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
                  selectedPlan === plan.id
                    ? selectedCardClass
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.highlight ? popularRingClass : ''}`}
              >
                {plan.highlight && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full ${isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]'}`}>
                    Populaire
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-3">
                  <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm"> TND{plan.period}</span>
                  {plan.commission !== '0%' && (
                    <span className="block text-sm text-orange-600 font-medium mt-1">
                      + {plan.commission} commission
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start text-sm text-gray-700">
                      <Check className={`w-4 h-4 ${classes.primaryText} mr-2 mt-0.5 flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={`mt-4 block text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlan === plan.id
                      ? classes.primary
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Premium Plans */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.slice(4).map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
                  selectedPlan === plan.id
                    ? selectedCardClass
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.highlight ? popularRingClass : ''}`}
              >
                {plan.highlight && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full ${isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]'}`}>
                    Populaire
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-3">
                  <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm"> TND{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start text-sm text-gray-700">
                      <Check className={`w-4 h-4 ${classes.primaryText} mr-2 mt-0.5 flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={`mt-4 block text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlan === plan.id
                      ? classes.primary
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={`${classes.footer} py-16 text-center`}>
        <h2 className="text-2xl font-bold text-white mb-4">Prêt à commencer ?</h2>
        <p className="text-gray-400 mb-6">Créez votre boutique en moins de 5 minutes.</p>
        <Link
          href="/register"
          className={`inline-flex items-center px-8 py-3 text-white rounded-full transition-all text-lg font-black hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
        >
          Créer ma boutique gratuitement <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
