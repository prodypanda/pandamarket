import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Politique de Remboursement & Retours | PandaMarket',
  description: 'Modalités de retour, droit de rétractation et délais de remboursement sur PandaMarket Tunisie.',
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-4 inline-block">
            &larr; Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Politique de Remboursement & Retours</h1>
          <p className="text-sm text-slate-500 mt-2">Délai de rétractation légal et procédure de retour pour les acheteurs</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Délai de Retour (10 Jours Ouvrables)</h2>
            <p>
              Tout acheteur sur PandaMarket dispose d&apos;un délai légal de 10 jours ouvrables à compter de la réception du colis pour signaler un retour
              ou demander un remboursement si le produit est non conforme, défectueux ou ne correspond pas aux attentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Conditions d&apos;Éligibilité</h2>
            <p>
              Pour être éligible au remboursement, l&apos;article doit être retourné dans son emballage d&apos;origine, non porté, non lavé, avec toutes ses
              étiquettes intactes. Les articles personnalisés sur-mesure ou les contenus numériques consommés ne sont pas éligibles au retour.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Délais & Modalités de Remboursement</h2>
            <p>
              Dès réception et inspection du produit par le vendeur ou notre centre logistique, le remboursement est validé sous 48 heures ouvrées :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Paiement par carte / Flouci / Konnect : Re-crédit automatique sur le compte bancaire de l&apos;acheteur sous 3 à 5 jours ouvrés.</li>
              <li>Paiement à la livraison (COD) : Virement bancaire direct sur le RIB de l&apos;acheteur ou bon d&apos;achat instantané sur la plateforme.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
