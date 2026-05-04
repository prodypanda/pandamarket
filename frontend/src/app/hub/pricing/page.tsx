import type { Metadata } from 'next';
import { Check, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tarifs — Choisissez votre plan',
  description: 'Comparez les 7 plans PandaMarket : Free (0 TND, 15% commission), Starter (300 TND/an), Regular, Agency, Pro, Golden, Platinum. 0% commission dès le plan Starter.',
  openGraph: {
    title: 'Tarifs PandaMarket — Des plans pour chaque ambition',
    description: 'Commencez gratuitement avec 15% de commission, ou choisissez un abonnement annuel à 0% de commission.',
    type: 'website',
    url: '/hub/pricing',
  },
};

const plans = [
  { id: 'free', name: 'Free', price: '0', period: '', commission: '15%', products: '10', images: '2', domain: false, ai: false, builder: false, directPay: false, apiKeys: false, whiteLabel: false, support: 'Forum' },
  { id: 'starter', name: 'Starter', price: '300', period: '/an', commission: '0%', products: '50', images: '5', domain: true, ai: true, builder: false, directPay: false, apiKeys: false, whiteLabel: false, support: 'Email' },
  { id: 'regular', name: 'Regular', price: '600', period: '/an', commission: '0%', products: '100', images: '7', domain: true, ai: true, builder: true, directPay: false, apiKeys: false, whiteLabel: false, support: 'Email' },
  { id: 'agency', name: 'Agency', price: '1 200', period: '/an', commission: '0%', products: '300', images: '10', domain: true, ai: true, builder: true, directPay: false, apiKeys: true, whiteLabel: false, support: 'Prioritaire' },
  { id: 'pro', name: 'Pro', price: '2 400', period: '/an', commission: '0%', products: '∞', images: '15', domain: true, ai: true, builder: true, directPay: true, apiKeys: true, whiteLabel: false, support: 'Dédié', popular: true },
  { id: 'golden', name: 'Golden', price: '4 800', period: '/an', commission: '0%', products: '∞', images: '20', domain: true, ai: true, builder: true, directPay: true, apiKeys: true, whiteLabel: false, support: 'Dédié' },
  { id: 'platinum', name: 'Platinum', price: '9 600', period: '/an', commission: '0%', products: '∞', images: '30', domain: true, ai: true, builder: true, directPay: true, apiKeys: true, whiteLabel: true, support: 'Dédié' },
];

const features = [
  { label: 'Produits max', key: 'products' },
  { label: 'Images / produit', key: 'images' },
  { label: 'Commission', key: 'commission' },
  { label: 'Domaine custom', key: 'domain', boolean: true },
  { label: 'Outils IA', key: 'ai', boolean: true },
  { label: 'Page Builder', key: 'builder', boolean: true },
  { label: 'Paiement direct', key: 'directPay', boolean: true },
  { label: 'API / Webhooks', key: 'apiKeys', boolean: true },
  { label: 'White Label', key: 'whiteLabel', boolean: true },
  { label: 'Support', key: 'support' },
];

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Des plans pour chaque <span className="text-[#16C784]">ambition</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Commencez gratuitement avec 15% de commission, ou choisissez un abonnement annuel à 0% de commission.
        </p>
      </div>

      {/* Plan Cards (Mobile) */}
      <div className="lg:hidden space-y-4 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-xl border-2 p-5 ${
              plan.popular ? 'border-[#16C784] shadow-lg shadow-[#16C784]/10' : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <span className="inline-block bg-[#16C784] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                Le plus populaire
              </span>
            )}
            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-extrabold">{plan.price}</span>
              <span className="text-gray-500"> TND{plan.period}</span>
              {plan.commission !== '0%' && (
                <span className="block text-sm text-orange-600 mt-1">+ {plan.commission} commission</span>
              )}
            </div>
            <ul className="space-y-2 mb-4">
              {features.map((f) => {
                const val = (plan as Record<string, unknown>)[f.key];
                return (
                  <li key={f.key} className="flex items-center text-sm">
                    {f.boolean ? (
                      val ? (
                        <Check className="w-4 h-4 text-[#16C784] mr-2" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mr-2" />
                      )
                    ) : (
                      <Check className="w-4 h-4 text-[#16C784] mr-2" />
                    )}
                    <span className={f.boolean && !val ? 'text-gray-400' : 'text-gray-700'}>
                      {f.label}: {f.boolean ? (val ? 'Oui' : 'Non') : val}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              href={`/register?plan=${plan.id}`}
              className={`block text-center py-2.5 rounded-lg font-medium transition-colors ${
                plan.popular
                  ? 'bg-[#16C784] text-white hover:bg-[#14b576]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Choisir {plan.name}
            </Link>
          </div>
        ))}
      </div>

      {/* Comparison Table (Desktop) */}
      <div className="hidden lg:block overflow-x-auto mb-12">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-4 w-48"></th>
              {plans.map((plan) => (
                <th key={plan.id} className="p-4 text-center">
                  <div className={`rounded-xl p-4 ${plan.popular ? 'bg-[#16C784]/5 ring-2 ring-[#16C784]' : ''}`}>
                    {plan.popular && (
                      <span className="inline-block bg-[#16C784] text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                        Populaire
                      </span>
                    )}
                    <div className="font-bold text-gray-900">{plan.name}</div>
                    <div className="text-2xl font-extrabold text-gray-900 mt-1">{plan.price}</div>
                    <div className="text-xs text-gray-500">TND{plan.period}</div>
                    {plan.commission !== '0%' && (
                      <div className="text-xs text-orange-600 mt-1">+ {plan.commission}</div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={f.key} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                <td className="p-4 text-sm font-medium text-gray-700">{f.label}</td>
                {plans.map((plan) => {
                  const val = (plan as Record<string, unknown>)[f.key];
                  return (
                    <td key={plan.id} className="p-4 text-center text-sm">
                      {f.boolean ? (
                        val ? (
                          <Check className="w-5 h-5 text-[#16C784] mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="font-medium text-gray-900">{val}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="p-4"></td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4 text-center">
                  <Link
                    href={`/register?plan=${plan.id}`}
                    className={`inline-block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      plan.popular
                        ? 'bg-[#16C784] text-white hover:bg-[#14b576]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Choisir
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-[#1A1A2E] to-[#25253D] rounded-2xl p-8 sm:p-12">
        <h2 className="text-2xl font-bold text-white mb-3">Prêt à lancer votre boutique ?</h2>
        <p className="text-gray-300 mb-6">Inscription gratuite, aucune carte bancaire requise.</p>
        <Link
          href="/register"
          className="inline-flex items-center px-6 py-3 bg-[#16C784] text-white rounded-lg hover:bg-[#1EE69A] transition-all font-semibold"
        >
          Créer ma boutique <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
      </div>
    </div>
  );
}
