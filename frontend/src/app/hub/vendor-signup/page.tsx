'use client';

import { useEffect, useState } from 'react';
import { Store, Check, ArrowRight, Shield, Globe, Palette, Bot, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';
import { fetchEnabledSubscriptionPlans, type DisplayPlan } from '../../../lib/subscription-plans';

const benefits = [
  { icon: Store, title: 'Votre boutique en ligne', desc: 'Sous-domaine gratuit + domaine personnalisable' },
  { icon: Globe, title: 'Visibilité Hub', desc: 'Vos produits visibles sur le marketplace central' },
  { icon: CreditCard, title: 'Paiements locaux', desc: 'Flouci, Konnect, Mandat Minute, COD' },
  { icon: Bot, title: 'Outils IA', desc: 'SEO automatique et compression d\'images' },
  { icon: Palette, title: 'Thèmes personnalisables', desc: '3 thèmes gratuits + Page Builder' },
  { icon: Shield, title: 'Sécurisé', desc: 'SSL automatique, paiements sécurisés' },
];

export default function VendorSignupPage() {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const { settings, classes, isAliExpress } = useMarketplaceTheme();
  const marketplaceName = settings.marketplace_name || 'PandaMarket';
  const accentText = isAliExpress ? 'text-[#ff8a00]' : 'text-[#16C784]';
  const selectedCardClass = `${classes.primaryBorder} shadow-lg ${isAliExpress ? 'shadow-orange-900/10' : 'shadow-[#16C784]/10'}`;
  const popularRingClass = isAliExpress ? 'ring-2 ring-[#ff4747]' : 'ring-2 ring-[#16C784]';

  useEffect(() => {
    let cancelled = false;
    fetchEnabledSubscriptionPlans().then((items) => {
      if (cancelled) return;
      setPlans(items);
      setSelectedPlan((current) => current || items.find((plan) => plan.highlight)?.id || items[0]?.id || '');
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
          href={selectedPlan ? `/register/seller?plan=${selectedPlan}` : '/register/seller'}
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

          {plans.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center text-sm font-semibold text-gray-500">
              Aucun plan n'est disponible actuellement.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
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
                  href={`/register/seller?plan=${plan.id}`}
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
          )}
        </div>
      </div>

      {/* CTA */}
      <div className={`${classes.footer} py-16 text-center`}>
        <h2 className="text-2xl font-bold text-white mb-4">Prêt à commencer ?</h2>
        <p className="text-gray-400 mb-6">Créez votre boutique en moins de 5 minutes.</p>
        <Link
          href={selectedPlan ? `/register/seller?plan=${selectedPlan}` : '/register/seller'}
          className={`inline-flex items-center px-8 py-3 text-white rounded-full transition-all text-lg font-black hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
        >
          Créer ma boutique gratuitement <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
