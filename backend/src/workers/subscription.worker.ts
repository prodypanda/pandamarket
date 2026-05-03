/**
 * Subscription worker —
 *   1. check_expiry: downgrades expired subscriptions to Free plan
 *   2. send_warnings: sends 7-day pre-expiry notifications
 */

import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { query } from '../db/pool';
import { subscriptionService } from '../services/subscription.service';
import { notificationService } from '../services/notification.service';
import { SubscriptionJobData } from '../queues/subscription-queue';
import { SubscriptionPlan } from '@pandamarket/types';

export function startSubscriptionWorker(): Worker<SubscriptionJobData> {
  const worker = new Worker<SubscriptionJobData>(
    'pd_subscription_queue',
    async (job: Job<SubscriptionJobData>) => {
      switch (job.data.type) {
        case 'check_expiry':
          await handleCheckExpiry();
          break;
        case 'send_warnings':
          await handleSendWarnings();
          break;
        default:
          logger.warn({ type: job.data.type }, 'Unknown subscription job type');
      }
    },
    { connection: getRedis(), concurrency: 1 },
  );

  worker.on('completed', (job) =>
    logger.debug({ type: job.data.type }, 'Subscription job completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error({ type: job?.data.type, err: err.message }, 'Subscription job failed'),
  );

  return worker;
}

/**
 * Find all stores with expired subscriptions and downgrade them to Free.
 */
async function handleCheckExpiry(): Promise<void> {
  const { rows } = await query<{
    id: string;
    subscription_plan: SubscriptionPlan;
    owner_id: string;
    name: string;
  }>(
    `SELECT id, subscription_plan, owner_id, name
     FROM pd_store
     WHERE subscription_expires_at IS NOT NULL
       AND subscription_expires_at < NOW()
       AND subscription_plan != $1`,
    [SubscriptionPlan.Free],
  );

  if (rows.length === 0) {
    logger.debug('No expired subscriptions found');
    return;
  }

  for (const store of rows) {
    try {
      await subscriptionService.changePlan(
        store.id,
        store.subscription_plan,
        SubscriptionPlan.Free,
      );

      // Notify the vendor
      await notificationService.create({
        user_id: store.owner_id,
        type: 'subscription.expired',
        title: 'Abonnement expiré',
        message: `Votre abonnement ${store.subscription_plan} pour "${store.name}" a expiré. Vous êtes maintenant sur le plan Free avec commission de 15%.`,
        data: {
          store_id: store.id,
          previous_plan: store.subscription_plan,
          new_plan: SubscriptionPlan.Free,
        },
      });

      logger.info(
        { store_id: store.id, from: store.subscription_plan, to: SubscriptionPlan.Free },
        'Subscription expired — downgraded to Free',
      );
    } catch (err) {
      logger.error(
        { store_id: store.id, err: (err as Error).message },
        'Failed to downgrade expired subscription',
      );
    }
  }

  logger.info({ count: rows.length }, 'Subscription expiry check completed');
}

/**
 * Send 7-day pre-expiry warning notifications.
 */
async function handleSendWarnings(): Promise<void> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

  const { rows } = await query<{
    id: string;
    subscription_plan: SubscriptionPlan;
    subscription_expires_at: Date;
    owner_id: string;
    name: string;
  }>(
    `SELECT id, subscription_plan, subscription_expires_at, owner_id, name
     FROM pd_store
     WHERE subscription_expires_at IS NOT NULL
       AND subscription_expires_at BETWEEN $1 AND $2
       AND subscription_plan != $3`,
    [sixDaysFromNow.toISOString(), sevenDaysFromNow.toISOString(), SubscriptionPlan.Free],
  );

  for (const store of rows) {
    try {
      await notificationService.create({
        user_id: store.owner_id,
        type: 'subscription.expiring_soon',
        title: 'Abonnement expire bientôt',
        message: `Votre abonnement ${store.subscription_plan} pour "${store.name}" expire dans 7 jours. Renouvelez-le pour éviter le passage au plan Free.`,
        data: {
          store_id: store.id,
          plan: store.subscription_plan,
          expires_at: store.subscription_expires_at.toISOString(),
        },
      });

      logger.info(
        { store_id: store.id, plan: store.subscription_plan },
        'Subscription expiry warning sent',
      );
    } catch (err) {
      logger.error(
        { store_id: store.id, err: (err as Error).message },
        'Failed to send expiry warning',
      );
    }
  }

  if (rows.length > 0) {
    logger.info({ count: rows.length }, 'Subscription expiry warnings sent');
  }
}
