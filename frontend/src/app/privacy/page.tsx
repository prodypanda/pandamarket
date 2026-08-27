import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Politique de Confidentialité | PandaMarket',
  description: 'Politique de protection des données personnelles conforme à la loi tunisienne n° 2004-63 (INPDP).',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-4 inline-block">
            &larr; Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Politique de Confidentialité & Protection des Données</h1>
          <p className="text-sm text-slate-500 mt-2">Conforme à la Loi Organique n° 2004-63 relative à la protection des données à caractère personnel (INPDP Tunisie)</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Collecte des Données à Caractère Personnel</h2>
            <p>
              PandaMarket collecte uniquement les données nécessaires au traitement des commandes, à la livraison, et à la gestion de la relation client :
              nom, prénom, numéro de téléphone, adresse de livraison en Tunisie, adresse email, et historique des transactions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Finalités du Traitement</h2>
            <p>
              Les données sont collectées pour : l&apos;exécution du contrat de vente, l&apos;acheminement des colis par nos partenaires logistiques agréés,
              la prévention des fraudes aux paiements électroniques et COD, et le respect des obligations légales et fiscales en vigueur en Tunisie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Sécurité & Chiffrement</h2>
            <p>
              Toutes les données sensibles (mots de passe, clés API, numéros de téléphone OTP) sont chiffrées selon les standards industriels (AES-256-GCM, Bcrypt).
              Aucune coordonnée de carte bancaire n&apos;est stockée sur nos serveurs ; les transactions transitent directement via les passerelles bancaires accréditées (Flouci, Konnect).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Vos Droits (Accès, Rectification & Suppression)</h2>
            <p>
              Conformément à la Loi 2004-63, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles.
              Vous pouvez exercer ces droits à tout moment depuis votre espace client ou en écrivant à <span className="font-semibold text-slate-900">privacy@pandamarket.tn</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
