'use client';

import React, { useState } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Clock,
  Code2,
  Lock,
  RefreshCw,
  Terminal,
  ExternalLink,
  Info,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface ApiKey {
  id: string;
  key_prefix: string;
  label: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export const AVAILABLE_SCOPES = [
  { id: 'read:products', label: 'Lecture Produits', desc: 'Consulter la liste, détails et stocks des articles du catalogue' },
  { id: 'write:products', label: 'Écriture Produits', desc: 'Créer, éditer et supprimer des produits et variantes' },
  { id: 'read:orders', label: 'Lecture Commandes', desc: 'Accéder aux flux de commandes, détails clients et statuts de livraison' },
  { id: 'write:orders', label: 'Écriture Commandes', desc: 'Mettre à jour les statuts de commande et numéros de suivi colis' },
  { id: 'read:customers', label: 'Lecture Clients', desc: 'Consulter les coordonnées, historiques dachat et profils clients' },
  { id: 'full_access', label: 'Accès Administrateur Global', desc: 'Permissions totales de lecture et écriture sur toutes les ressources' },
];

export interface SellerReGoApiKeysProps {
  keys: ApiKey[];
  loading: boolean;
  error: string;
  showCreate: boolean;
  onShowCreateChange: (open: boolean) => void;
  newLabel: string;
  onNewLabelChange: (label: string) => void;
  newScopes: string[];
  onToggleScope: (scope: string) => void;
  newExpiresAt: string;
  onNewExpiresAtChange: (val: string) => void;
  creating: boolean;
  createError: string;
  onCreateKey: () => Promise<void> | void;
  newlyCreatedKey: string | null;
  onClearNewlyCreatedKey: () => void;
  copied: boolean;
  onCopyKey: () => Promise<void> | void;
  revokeId: string | null;
  onRevokeIdChange: (id: string | null) => void;
  revoking: boolean;
  onRevokeKey: (id: string) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoApiKeys({
  keys,
  loading,
  error,
  showCreate,
  onShowCreateChange,
  newLabel,
  onNewLabelChange,
  newScopes,
  onToggleScope,
  newExpiresAt,
  onNewExpiresAtChange,
  creating,
  createError,
  onCreateKey,
  newlyCreatedKey,
  onClearNewlyCreatedKey,
  copied,
  onCopyKey,
  revokeId,
  onRevokeIdChange,
  revoking,
  onRevokeKey,
  onRefresh,
  dir = 'ltr',
}: SellerReGoApiKeysProps) {
  const activeKeys = keys.filter((k) => k.is_active);
  const totalScopesCount = Array.from(new Set(keys.flatMap((k) => k.scopes))).length;
  const recentKey = [...keys].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Espace Vendeur', href: '/hub/dashboard' },
        { label: 'Développeur & API' },
      ]}
      headerTitle="Clés d'API REST & Développeur"
      headerSubtitle="Générez et sécurisez vos jetons d'accès pour intégrer votre ERP, système de caisse ou application tierce."
      headerIcon={Key}
      statusBadge={
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          ReGo DevEngine
        </span>
      }
      primaryAction={
        <button
          onClick={() => {
            onShowCreateChange(true);
            onClearNewlyCreatedKey();
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Clé API</span>
        </button>
      }
      secondaryAction={
        <button
          onClick={() => void onRefresh()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      }
      mainContent={
        <div className="space-y-6" dir={dir}>
          {/* Newly Generated Secret Banner */}
          {newlyCreatedKey && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-slate-900 dark:text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Clé secrète générée avec succès</span>
                </div>
                <button
                  onClick={onClearNewlyCreatedKey}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                >
                  Fermer
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Copiez immédiatement cette clé. Pour des raisons de sécurité, <strong className="text-amber-600 dark:text-amber-300">elle ne sera plus jamais affichée</strong> après fermeture.
              </p>
              <div className="flex items-center gap-2 p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800">
                <span className="flex-1 select-all break-all">{newlyCreatedKey}</span>
                <button
                  onClick={() => void onCopyKey()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Telemetry KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReGoKpiHero
              label="Clés API Actives"
              value={activeKeys.length}
              hint="Jetons autorisés sur l'API PandaMarket"
              icon={Key}
              accent
            />
            <ReGoKpiHero
              label="Périmètres Accordés"
              value={totalScopesCount}
              hint="Permissions distinctes déléguées"
              icon={ShieldCheck}
            />
            <ReGoKpiHero
              label="Dernière Utilisation"
              value={
                recentKey?.last_used_at
                  ? new Date(recentKey.last_used_at).toLocaleDateString('fr-TN', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : 'Aucune'
              }
              hint="Activité des requêtes reçues"
              icon={Clock}
            />
            <ReGoKpiHero
              label="Conformité Sécurité"
              value="TLS 1.3 / SHA-256"
              hint="Chiffrement des clés en base"
              icon={Lock}
            />
          </div>

          {/* Active Keys Section */}
          <ReGoCard
            title="Vos Clés d'Accès REST"
            subtitle="Toutes les clés autorisées associées à votre identifiant boutique marchand."
            actions={
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {keys.length} clé{keys.length > 1 ? 's' : ''} enregistrée{keys.length > 1 ? 's' : ''}
              </span>
            }
          >
            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : keys.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Key className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Aucune clé API créée
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Générez votre première clé pour connecter votre logiciel de facturation ou synchroniser vos stocks avec l&apos;API PandaMarket.
                  </p>
                </div>
                <button
                  onClick={() => onShowCreateChange(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl transition"
                >
                  Générer une Clé
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 px-4">Libellé & Préfixe</th>
                      <th className="pb-3 px-4">Périmètres (Scopes)</th>
                      <th className="pb-3 px-4">Dernier Appel</th>
                      <th className="pb-3 px-4">Statut</th>
                      <th className="pb-3 px-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 dark:text-white">{k.label}</span>
                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                                {k.key_prefix}...
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {k.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300"
                              >
                                {scope}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {k.last_used_at ? (
                            new Date(k.last_used_at).toLocaleDateString('fr-TN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <span className="text-slate-400">Jamais utilisée</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {k.is_active ? (
                            <ReGoStatusChip status="ok" label="Active" />
                          ) : (
                            <ReGoStatusChip status="neutral" label="Désactivée" />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <button
                            onClick={() => onRevokeIdChange(k.id)}
                            className="p-1.5 text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Révoquer cette clé"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReGoCard>

          {/* Quickstart Developer Terminal */}
          <ReGoCard
            title="Démarrage Rapide API"
            subtitle="Exemple de requête authentifiée via cURL pour tester votre connectivité."
            actions={<Terminal className="w-4 h-4 text-slate-400" />}
          >
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
                <p className="text-slate-500 dark:text-slate-400 mb-1"># Test d&apos;authentification avec votre clé</p>
                <p className="text-emerald-400">
                  curl -X GET https://api.pandamarket.tn/api/pd/vendor/profile \
                </p>
                <p className="pl-4 text-slate-300">
                  -H &quot;Authorization: Bearer <span className="text-amber-400">pd_live_votre_cle_secrete</span>&quot; \
                </p>
                <p className="pl-4 text-slate-300">
                  -H &quot;Content-Type: application/json&quot;
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Documentation complète disponible sur docs.pandamarket.tn
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Format de réponse : JSON (UTF-8)
                </span>
              </div>
            </div>
          </ReGoCard>

          {/* Create Modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-slate-900 dark:text-white" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Créer une Clé d&apos;API</h3>
                  </div>
                  <button
                    onClick={() => onShowCreateChange(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>

                {createError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/50">
                    {createError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nom / Libellé du Service <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => onNewLabelChange(e.target.value)}
                      placeholder="Ex: Synchroniseur Caisse Sousse, ERP Sage"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-slate-900 dark:focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Permissions & Périmètres d&apos;accès <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {AVAILABLE_SCOPES.map((scope) => {
                        const checked = newScopes.includes(scope.id);
                        return (
                          <div
                            key={scope.id}
                            onClick={() => onToggleScope(scope.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                              checked
                                ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              tabIndex={-1}
                              className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-0 pointer-events-none"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {scope.label}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                                {scope.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Date d&apos;Expiration (Optionnelle)
                    </label>
                    <input
                      type="date"
                      value={newExpiresAt}
                      onChange={(e) => onNewExpiresAtChange(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-slate-900 dark:focus:border-white transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onShowCreateChange(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => void onCreateKey()}
                    disabled={creating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Générer la Clé</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Revoke Dialog */}
          <ConfirmDialog
            isOpen={Boolean(revokeId)}
            title="Révoquer cette clé API ?"
            description="Toutes les requêtes futures utilisant cette clé seront immédiatement rejetées avec un code 401 Unauthorized. Cette action est irréversible."
            confirmLabel="Révoquer Définitivement"
            cancelLabel="Annuler"
            variant="danger"
            onConfirm={() => {
              if (revokeId) void onRevokeKey(revokeId);
            }}
            onClose={() => onRevokeIdChange(null)}
          />
        </div>
      }
    />
  );
}
