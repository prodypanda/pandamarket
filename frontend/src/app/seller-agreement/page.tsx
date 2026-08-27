import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Contrat Vendeur Marketplace | PandaMarket',
  description: "Conditions contractuelles, commissions et engagements pour les marchands et créateurs partenaires de PandaMarket.",
};

export default function SellerAgreementPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-4 inline-block">
            &larr; Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contrat Vendeur Marketplace PandaMarket</h1>
          <p className="text-sm text-slate-500 mt-2">Conditions régissant les marchands partenaires, artisans et créateurs en Tunisie</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Adhésion & Vérification d&apos;Identité (KYC)</h2>
            <p>
              Tout vendeur s&apos;engage à fournir un extrait de Registre National des Entreprises (RNE) ou une copie de CIN valide lors de son inscription,
              conformément aux directives bancaires et fiscales en vigueur en Tunisie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Commissions & Frais de Transaction</h2>
            <p>
              PandaMarket applique un taux de commission transparent sur chaque commande finalisée, dépendant du forfait choisi (Standard, Pro, ou Artisan).
              Les commissions sont automatiquement déduites du portefeuille électronique (Wallet) du marchand lors du règlement de la commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Délais de Règlement & Virements Bancaires</h2>
            <p>
              Les fonds nets issus des ventes sont libérés sur le portefeuille du vendeur à l&apos;issue de la période de rétention de sécurité (2 à 7 jours selon le mode de paiement).
              Le vendeur peut demander un virement bancaire dès que son solde disponible atteint le seuil minimal de 20 TND.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
