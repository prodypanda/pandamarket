'use client';

import React, { useState } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Send, Tag, Percent, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface BroadcastHistoryItem {
  id: string;
  created_at: string;
  title: string;
  message: string;
  coupon_code: string;
  discount_value: string;
  recipients_count: number;
  claims_count: number;
  claim_rate_pct: number;
  generated_gmv_tnd: number;
  status: 'sent' | 'active' | 'expired';
}

export interface BroadcastComposerProps {
  totalSubscribers: number;
  remainingQuota: number;
  onSuccess?: (broadcast: BroadcastHistoryItem, remainingQuota: number) => void;
  className?: string;
}

export const BroadcastComposer: React.FC<BroadcastComposerProps> = ({
  totalSubscribers,
  remainingQuota,
  onSuccess,
  className = '',
}) => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountValue, setDiscountValue] = useState('10%');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);
    setComposerSuccess(null);

    if (remainingQuota <= 0) {
      setComposerError('Limite hebdomadaire atteinte (max 2 diffusions par semaine).');
      return;
    }

    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setComposerError('Veuillez renseigner le titre et le message de diffusion.');
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await fetchWithCsrf('/api/pd/seller/subscribers/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          coupon_code: couponCode.trim() || null,
          discount_value: discountValue,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Limite de diffusion atteinte pour cette semaine calendaire.');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Erreur lors de la diffusion');
      }

      const resJson = await res.json();
      const recipients = resJson.recipients_count ?? totalSubscribers ?? 0;
      const newRemaining = resJson.remaining_quota ?? Math.max(0, remainingQuota - 1);

      const newBroadcast: BroadcastHistoryItem = {
        id: resJson.broadcast_id || `b_${Date.now()}`,
        created_at: new Date().toISOString(),
        title: broadcastTitle,
        message: broadcastMessage,
        coupon_code: couponCode.toUpperCase() || 'AUCUN',
        discount_value: discountValue,
        recipients_count: recipients,
        claims_count: 0,
        claim_rate_pct: 0,
        generated_gmv_tnd: 0,
        status: 'sent',
      };

      setComposerSuccess(`Diffusion envoyée avec succès à ${recipients} abonnés !`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setCouponCode('');

      if (onSuccess) {
        onSuccess(newBroadcast, newRemaining);
      }
    } catch (err: any) {
      setComposerError(err.message || 'Une erreur est survenue.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <section
      className={`p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 ${className}`}
      data-testid="broadcast-composer-section"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>✉️</span> Diffuser une Offre aux Abonnés
        </h2>
        <span className="text-xs text-zinc-400">
          Portée: {totalSubscribers.toLocaleString()} destinataires
        </span>
      </div>

      {composerSuccess && (
        <div
          role="status"
          className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{composerSuccess}</span>
        </div>
      )}

      {composerError && (
        <div
          role="alert"
          className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{composerError}</span>
        </div>
      )}

      {totalSubscribers === 0 ? (
        <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 text-xs space-y-2">
          <p>Vous n'avez pas encore d'abonnés pour envoyer une diffusion privée.</p>
          <p className="text-[11px] text-zinc-400">
            Partagez votre boutique sur vos réseaux sociaux pour attirer vos premiers abonnés !
          </p>
        </div>
      ) : (
        <form onSubmit={handleSendBroadcast} className="space-y-4" data-testid="broadcast-form">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Titre de la diffusion *
            </label>
            <input
              type="text"
              data-testid="input-broadcast-title"
              placeholder="Ex: -15% Exclusif Abonnés ce Week-end !"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              disabled={remainingQuota <= 0 || sendingBroadcast}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Message personnalisé ({broadcastMessage.length}/500) *
            </label>
            <textarea
              data-testid="input-broadcast-message"
              rows={3}
              maxLength={500}
              placeholder="Chers abonnés, profitez d'une réduction privée valable 48h..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              disabled={remainingQuota <= 0 || sendingBroadcast}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-zinc-400" /> Code Coupon Privé (optionnel)
              </label>
              <input
                type="text"
                data-testid="input-coupon-code"
                placeholder="Ex: VIP15"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={remainingQuota <= 0 || sendingBroadcast}
                className="w-full px-3 py-2 text-sm uppercase font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-zinc-400" /> Remise
              </label>
              <input
                type="text"
                data-testid="input-discount-value"
                placeholder="Ex: 15% ou 10 DT"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={remainingQuota <= 0 || sendingBroadcast}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <button
            type="submit"
            data-testid="btn-submit-broadcast"
            disabled={sendingBroadcast || remainingQuota <= 0}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>
              {sendingBroadcast
                ? 'Envoi en cours...'
                : remainingQuota <= 0
                ? 'Limite hebdomadaire atteinte (2/2)'
                : 'Envoyer la diffusion privée'}
            </span>
          </button>
        </form>
      )}
    </section>
  );
};
