'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Wallet,
  Store,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
  Server,
  Eye,
  Check,
  XCircle,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

interface KycItem {
  id: string;
  store_name: string;
  merchant_name: string;
  governorate: string;
  doc_type: string;
  submission_date: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface WithdrawalItem {
  id: string;
  store_name: string;
  rib: string;
  bank_name: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed';
  request_date: string;
}

export function AdminReGoOverview({
  platformGmv = 124890.500,
  activeStoresCount = 384,
  escrowBalance = 32410.200,
  buyersCount = 18920,
}: {
  platformGmv?: number;
  activeStoresCount?: number;
  escrowBalance?: number;
  buyersCount?: number;
}) {
  const [selectedKyc, setSelectedKyc] = useState<KycItem | null>(null);
  const [approvedKycIds, setApprovedKycIds] = useState<Record<string, boolean>>({});

  const pendingKycs: KycItem[] = [
    {
      id: 'kyc-101',
      store_name: 'Dar El Harka',
      merchant_name: 'Karim Zouari',
      governorate: 'Nabeul',
      doc_type: 'CIN + Registre RNE',
      submission_date: 'Aujourd\'hui 10:14',
      status: 'pending',
    },
    {
      id: 'kyc-102',
      store_name: 'Medina Cuir',
      merchant_name: 'Amira Ben Romdhane',
      governorate: 'Tunis',
      doc_type: 'CIN + Attestation RIB',
      submission_date: 'Hier 18:30',
      status: 'pending',
    },
    {
      id: 'kyc-103',
      store_name: 'Sud Terroir Huile',
      merchant_name: 'Mabrouk Guesmi',
      governorate: 'Sidi Bouzid',
      doc_type: 'Registre Commercial RNE',
      submission_date: 'Hier 14:15',
      status: 'pending',
    },
  ];

  const pendingWithdrawals: WithdrawalItem[] = [
    {
      id: 'wth-201',
      store_name: 'Artisanat Sahel',
      rib: '08 045 0001234567890 44',
      bank_name: 'BIAT Tunisie',
      amount: 1450.000,
      status: 'pending',
      request_date: 'Ce matin',
    },
    {
      id: 'wth-202',
      store_name: 'Panda Électro Shop',
      rib: '03 012 0109876543210 18',
      bank_name: 'BNA Banque',
      amount: 2890.500,
      status: 'pending',
      request_date: 'Hier',
    },
  ];

  const handleApproveKyc = (id: string) => {
    setApprovedKycIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-6">
      {/* Executive Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[var(--rego-fg,#111111)]">PandaMarket Superadmin Hub</h2>
              <ReGoStatusChip status="ok" label="Plateforme Opérationnelle" size="xs" />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Gouvernance ReGo · Supervision globale du volume d&apos;affaires et de l&apos;escrow national
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/kyc"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <FileCheck className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>Audits KYC</span>
          </Link>
          <Link
            href="/withdrawals"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Virements RIB</span>
          </Link>
        </div>
      </div>

      {/* Layer 4: Platform KPIs Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Volume d'Affaires Global (GMV)"
          value={<ReGoAmtBox amount={platformGmv} size="lg" />}
          delta={22.4}
          deltaType="increase"
          hint="Volume total traité sur le réseau"
          icon={Activity}
        />
        <ReGoKpiHero
          label="Fonds Sécurisés Escrow"
          value={<ReGoAmtBox amount={escrowBalance} size="lg" />}
          delta={9.1}
          deltaType="increase"
          hint="En attente de confirmation acheteur"
          icon={Wallet}
        />
        <ReGoKpiHero
          label="Boutiques Vendeurs Actives"
          value={activeStoresCount}
          delta={4.8}
          deltaType="increase"
          hint="Marchands validés sur 24 gouvernorats"
          icon={Store}
        />
        <ReGoKpiHero
          label="Comptes Acheteurs"
          value={buyersCount.toLocaleString('fr-TN')}
          delta={12.0}
          deltaType="increase"
          hint="Clients enregistrés vérifiés"
          icon={Users}
        />
      </div>

      {/* High-Priority Governance Modules: Pending KYC Approvals & Withdrawals Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pending KYC Dossiers (7 cols) */}
        <div className="lg:col-span-7">
          <ReGoCard
            title="Dossiers KYC Marchands en Attente"
            subtitle="Vérification légale des pièces d'identité CIN et des matricules fiscaux RNE"
            icon={FileCheck}
            badge={<ReGoStatusChip status="warn" label="Prioritaire" size="xs" />}
            actions={
              <Link href="/kyc" className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline">
                Voir tous les dossiers
              </Link>
            }
          >
            <div className="space-y-2.5">
              {pendingKycs.map((item) => {
                const isApproved = approvedKycIds[item.id];
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 hover:bg-[var(--rego-surface,#f5f5f5)]/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[var(--rego-fg,#111111)]">{item.store_name}</span>
                        <span className="text-[10px] text-[var(--rego-ink-2,#737373)] font-semibold">({item.merchant_name})</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[var(--rego-ink-2,#737373)] font-medium">
                          {item.governorate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
                        <span className="font-medium text-[11px] text-[var(--rego-accent,#ad0505)]">{item.doc_type}</span>
                        <span>•</span>
                        <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">{item.submission_date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedKyc(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] px-2.5 py-1 rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspecter</span>
                      </button>

                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 px-2 py-1 rounded bg-emerald-50">
                          <Check className="w-3.5 h-3.5" /> Approuvé
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApproveKyc(item.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold bg-[var(--rego-accent,#ad0505)] text-white hover:bg-[var(--rego-accent-deep,#8f0404)] px-3 py-1 rounded-[var(--rego-r,8px)] transition-all shadow-2xs"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Valider</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ReGoCard>
        </div>

        {/* Pending Payout Disbursements (5 cols) */}
        <div className="lg:col-span-5">
          <ReGoCard
            title="Décaissements RIB Vendeurs"
            subtitle="Ordres de virement bancaire 20 chiffres Modulo 97"
            icon={Wallet}
            actions={
              <Link href="/withdrawals" className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline">
                Générer Fichier Batch
              </Link>
            }
          >
            <div className="space-y-2.5">
              {pendingWithdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">{w.store_name}</span>
                    <p className="font-mono text-[10px] text-[var(--rego-ink-2,#737373)] mt-0.5">{w.rib}</p>
                    <span className="text-[10px] font-semibold text-emerald-600">{w.bank_name}</span>
                  </div>
                  <div className="text-right">
                    <ReGoAmtBox amount={w.amount} size="md" />
                    <p className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">En attente de virement</p>
                  </div>
                </div>
              ))}
            </div>
          </ReGoCard>
        </div>
      </div>

      {/* Layer 7: KYC Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedKyc)}
        onClose={() => setSelectedKyc(null)}
        title={`Audit KYC: ${selectedKyc?.store_name}`}
        subtitle={`Marchand: ${selectedKyc?.merchant_name} · Gouvernorat de ${selectedKyc?.governorate}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedKyc(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedKyc) handleApproveKyc(selectedKyc.id);
                setSelectedKyc(null);
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            >
              Approuver le Dossier
            </button>
          </>
        }
      >
        {selectedKyc && (
          <div className="space-y-4">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3 bg-[var(--rego-surface,#f5f5f5)]/50 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">Type de Documents Reçus</span>
              <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">{selectedKyc.doc_type}</p>
              <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">Reçu le {selectedKyc.submission_date}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Contrôles de Conformité</h4>
              <ul className="text-xs space-y-1.5 text-[var(--rego-ink-2,#737373)]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Carte d&apos;Identité Nationale (CIN) lisible recto-verso</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Matricule fiscal vérifié au Registre National des Entreprises (RNE)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Attestation RIB conforme (20 chiffres avec clé Modulo 97)</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
