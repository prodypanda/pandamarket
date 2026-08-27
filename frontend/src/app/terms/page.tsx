import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "Conditions Générales d'Utilisation | PandaMarket",
  description: "Conditions générales d'utilisation de la plateforme marketplace PandaMarket Tunisie.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-4 inline-block">
            &larr; Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Conditions Générales d&apos;Utilisation (CGU)</h1>
          <p className="text-sm text-slate-500 mt-2">Dernière mise à jour : Août 2026 | Version 2.4 (Loi tunisienne N° 2000-83 sur le commerce électronique)</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Objet & Présentation de la Plateforme</h2>
            <p>
              PandaMarket est une plateforme de commerce électronique (marketplace) multi-vendeurs opérant en République Tunisienne.
              Elle permet aux vendeurs indépendants (artisans, créateurs, commerçants) de proposer leurs produits à des acheteurs finaux.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Inscription & Comptes Utilisateurs</h2>
            <p>
              L&apos;accès à certaines fonctionnalités nécessite la création d&apos;un compte. L&apos;utilisateur s&apos;engage à fournir des informations
              exactes et à maintenir la confidentialité de ses identifiants. Toute activité réalisée depuis un compte est réputée effectuée par son titulaire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Commandes, Prix & Paiement</h2>
            <p>
              Les prix affichés sur la plateforme sont exprimés en Dinars Tunisiens (TND) toutes taxes comprises. Les paiements peuvent être
              effectués par carte bancaire (via passerelles sécurisées agréées en Tunisie : Flouci, Konnect, GPG), par mandat postal (e-Dinar),
              ou à la livraison (Cash on Delivery).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Droit de Rétractation & Retours</h2>
            <p>
              Conformément à la législation tunisienne relative à la protection du consommateur et au commerce électronique, l&apos;acheteur
              bénéficie d&apos;un délai de rétractation de 10 jours ouvrables à compter de la réception du produit, sous réserve que l&apos;article
              soit retourné dans son état d&apos;origine et non utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Propriété Intellectuelle & Droit Applicable</h2>
            <p>
              Tous les éléments du site (marques, designs, textes, codes sources) sont la propriété exclusive de PandaMarket ou de ses concédants.
              Les présentes conditions sont régies par le droit tunisien. Tout litige sera soumis aux tribunaux compétents de Tunis.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
