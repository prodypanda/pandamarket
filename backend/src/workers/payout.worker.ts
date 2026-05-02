/**
 * Payout worker —
 *   1. release_due_funds: moves pending balance → available balance
 *      for transactions whose `available_at` has passed.
 *   2. auto_payout: triggers a withdrawal for every vendor whose
 *      payout_mode = 'automatic' and balance ≥ minimum threshold.
 *
 * Real bank transfers are out of scope for the MVP — the wallet is
 * debited and a `payout_completed` event is emitted, which can be
 * picked up later by an integration with the bank provider.
 */

import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { walletService } from '../services/wallet.service';
import { query } from '../db/pool';
import { config } from '../config';
import { eventBus, PdEvent } from '../events/event-bus';
import { PayoutJobData } from '../queues/payout-queue';
import { PayoutMode } from '@pandamarket/types';

export function startPayoutWorker(): Worker<PayoutJobData> {
  const worker = new Worker<PayoutJobData>(
    'pd_payout_queue',
    async (job: Job<PayoutJobData>) => {
      switch (job.data.type) {
        case 'release_due_funds':
          await handleRelease();
          break;
        case 'auto_payout':
          await handleAutoPayout();
          break;
        default:
          logger.warn({ type: job.data.type }, 'Unknown payout job type');
      }
    },
    { connection: getRedis(), concurrency: 1 },
  );

  worker.on('completed', (job) =>
    logger.debug({ type: job.data.type }, 'Payout job completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error({ type: job?.data.type, err: err.message }, 'Payout job failed'),
  );

  return worker;
}

async function handleRelease(): Promise<void> {
  const released = await walletService.releaseDueFunds();
  if (released > 0) {
    // Notify the affected vendors via an event (subscribers handle email/in-app).
    const { rows } = await query<{ store_id: string; balance: string; owner_id: string }>(
      `SELECT w.store_id, w.balance::text, s.owner_id
         FROM pd_vendor_wallet w
         JOIN pd_store s ON s.id = w.store_id`,
    );
    for (const r of rows) {
      eventBus.emit(PdEvent.WALLET_FUNDS_AVAILABLE, {
        store_id: r.store_id,
        owner_id: r.owner_id,
        balance: parseFloat(r.balance),
      });
    }
  }
}

async function handleAutoPayout(): Promise<void> {
  const { rows } = await query<{
    store_id: string;
    balance: string;
    owner_id: string;
  }>(
    `SELECT w.store_id, w.balance::text, s.owner_id
       FROM pd_vendor_wallet w
       JOIN pd_store s ON s.id = w.store_id
      WHERE w.payout_mode = $1
        AND w.balance::numeric >= $2`,
    [PayoutMode.Automatic, config.minWithdrawalTnd],
  );
  for (const row of rows) {
    const amount = parseFloat(row.balance);
    try {
      await walletService.withdraw({
        store_id: row.store_id,
        amount,
        notes: 'Automatic payout',
      });
      eventBus.emit(PdEvent.WALLET_PAYOUT_COMPLETED, {
        store_id: row.store_id,
        owner_id: row.owner_id,
        amount,
        method: 'auto',
      });
      logger.info({ store_id: row.store_id, amount }, 'Auto payout processed');
    } catch (err) {
      logger.error(
        { store_id: row.store_id, err: (err as Error).message },
        'Auto payout failed',
      );
    }
  }
}
