'use client';

import React, { useState } from 'react';

export interface CourierPackage {
  id: string;
  orderNumber: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  codAmount: number; // In TND
  status: 'pending' | 'out_for_delivery' | 'delivered' | 'failed';
}

const SAMPLE_MANIFEST: CourierPackage[] = [
  {
    id: 'pkg_1',
    orderNumber: 'ORD-882194',
    recipientName: 'Sami Mansour',
    phone: '+21620112233',
    address: '14 Rue Ibn Khaldoun',
    city: 'Tunis',
    codAmount: 85.5,
    status: 'out_for_delivery',
  },
  {
    id: 'pkg_2',
    orderNumber: 'ORD-882195',
    recipientName: 'Fatma Ben Ali',
    phone: '+21698445566',
    address: 'Avenue Habib Bourguiba, Résidence Ennasr',
    city: 'Ariana',
    codAmount: 140.0,
    status: 'out_for_delivery',
  },
  {
    id: 'pkg_3',
    orderNumber: 'ORD-882196',
    recipientName: 'Mohamed Dridi',
    phone: '+21655778899',
    address: '5 Rue de la Plage',
    city: 'La Marsa',
    codAmount: 45.0,
    status: 'delivered',
  },
];

export default function CourierConsolePage() {
  const [packages, setPackages] = useState<CourierPackage[]>(SAMPLE_MANIFEST);
  const [selectedPkg, setSelectedPkg] = useState<CourierPackage | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const totalCodToCollect = packages.reduce((sum, p) => sum + p.codAmount, 0);
  const totalCashCollected = packages
    .filter((p) => p.status === 'delivered')
    .reduce((sum, p) => sum + p.codAmount, 0);
  const deliveredCount = packages.filter((p) => p.status === 'delivered').length;

  const handleOpenOtpModal = (pkg: CourierPackage) => {
    setSelectedPkg(pkg);
    setOtpCode('');
    setOtpError('');
  };

  const handleConfirmDelivery = async () => {
    if (!selectedPkg) return;
    if (otpCode.length !== 4) {
      setOtpError('Veuillez entrer le code OTP à 4 chiffres fourni par le client.');
      return;
    }

    setIsVerifying(true);
    try {
      // Simulate OTP verification and delivery confirmation
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPackages((prev) =>
        prev.map((p) => (p.id === selectedPkg.id ? { ...p, status: 'delivered' } : p)),
      );
      setSelectedPkg(null);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-30 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-base font-black tracking-tight flex items-center space-x-2">
            <span>🛵</span>
            <span>PandaMarket Livreur</span>
          </h1>
          <p className="text-xs text-slate-400">Tournée du jour — Grand Tunis</p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-emerald-900/80 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-700">
            {deliveredCount}/{packages.length} Livrés
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Cash Tally Sheet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Bilan Caisse Espèces (COD)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Encaissé
              </span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalCashCollected.toFixed(3)} DT
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <span className="text-xs text-slate-500 font-medium">Total Tournée</span>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-0.5">
                {totalCodToCollect.toFixed(3)} DT
              </p>
            </div>
          </div>
        </div>

        {/* Package Route List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Colis à livrer ({packages.length})
          </h2>

          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm transition ${
                pkg.status === 'delivered'
                  ? 'border-emerald-200 dark:border-emerald-900/50 opacity-75'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    #{pkg.orderNumber}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {pkg.recipientName}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    pkg.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                  }`}
                >
                  {pkg.status === 'delivered' ? '✓ Livré' : 'En cours'}
                </span>
              </div>

              <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="flex items-center space-x-1.5">
                  <span>📍</span>
                  <span>
                    {pkg.address}, <strong className="text-slate-800 dark:text-slate-200">{pkg.city}</strong>
                  </span>
                </p>
                <p className="flex items-center space-x-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <span>💵</span>
                  <span>Montant à encaisser : {pkg.codAmount.toFixed(3)} DT</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                <a
                  href={`tel:${pkg.phone}`}
                  className="flex-1 py-2 text-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <span>📞</span>
                  <span>Appeler</span>
                </a>

                {pkg.status !== 'delivered' && (
                  <button
                    type="button"
                    onClick={() => handleOpenOtpModal(pkg)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow"
                  >
                    Valider Livraison
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handshake OTP Confirmation Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <span className="text-4xl">🤝</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                Validation de Remise
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Demandez au client le code secret à 4 chiffres reçu par SMS.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs text-slate-700 dark:text-slate-300">
              <p>
                <strong>Client :</strong> {selectedPkg.recipientName}
              </p>
              <p className="mt-1">
                <strong>Espèces à encaisser :</strong> {selectedPkg.codAmount.toFixed(3)} DT
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                Code OTP (4 chiffres)
              </label>
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1 2 3 4"
                className="w-full text-center tracking-widest text-2xl font-mono py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
              {otpError && <p className="text-xs text-red-600 mt-1 text-center">{otpError}</p>}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPkg(null)}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={isVerifying || otpCode.length !== 4}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow"
              >
                {isVerifying ? 'Vérification...' : 'Confirmer & Encaisser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
