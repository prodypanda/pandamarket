/**
 * Queue for payment-attempt reconciliation and initialization compensation.
 * Jobs are intentionally small and identify only a local attempt; provider
 * credentials are loaded server-side by the reconciliation service.
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface PaymentReconciliationJobData {
  type: 'reconcile_attempt' | 'compensate_attempt' | 'sweep_due_attempts';
  attempt_id?: string;
}

export const paymentReconciliationQueue = new Queue<PaymentReconciliationJobData>(
  'pd_payment_reconciliation_queue',
  {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: { count: 1000 },
      // Attempt state and error details live in pd_payment_attempt. Removing
      // exhausted jobs lets a later database sweep reuse the deterministic ID
      // instead of being blocked by a stale failed BullMQ record.
      removeOnFail: true,
    },
  },
);

export async function enqueuePaymentReconciliation(
  attemptId: string,
  runAt?: Date,
): Promise<void> {
  const delay = runAt ? Math.max(0, runAt.getTime() - Date.now()) : 0;
  await paymentReconciliationQueue.add(
    'reconcile_attempt',
    { type: 'reconcile_attempt', attempt_id: attemptId },
    {
      ...(delay ? { delay } : {}),
      jobId: `reconcile-attempt-${attemptId}-${runAt ? runAt.getTime() : 'immediate'}`,
    },
  );
}

export async function enqueuePaymentCompensation(attemptId: string): Promise<void> {
  await paymentReconciliationQueue.add(
    'compensate_attempt',
    { type: 'compensate_attempt', attempt_id: attemptId },
    { jobId: `compensate-attempt-${attemptId}` },
  );
}

export async function schedulePaymentReconciliationSweep(): Promise<void> {
  await paymentReconciliationQueue.add(
    'sweep_due_attempts',
    { type: 'sweep_due_attempts' },
    {
      repeat: { pattern: '*/5 * * * *' },
      jobId: 'recurring-payment-reconciliation-sweep',
    },
  );
}
