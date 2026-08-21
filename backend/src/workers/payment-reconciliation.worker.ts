import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { PaymentReconciliationJobData } from '../queues/payment-reconciliation-queue';
import { paymentReconciliationService } from '../services/payment-reconciliation.service';

export function startPaymentReconciliationWorker(): Worker<PaymentReconciliationJobData> {
  const worker = new Worker<PaymentReconciliationJobData>(
    'pd_payment_reconciliation_queue',
    async (job: Job<PaymentReconciliationJobData>) => {
      if (job.data.type === 'sweep_due_attempts') {
        await paymentReconciliationService.sweepDueAttempts();
      } else if (job.data.type === 'compensate_attempt' && job.data.attempt_id) {
        await paymentReconciliationService.compensateAttempt(job.data.attempt_id);
      } else if (job.data.attempt_id) {
        await paymentReconciliationService.reconcileAttempt(job.data.attempt_id);
      }
    },
    { connection: getRedis(), concurrency: 1 },
  );
  worker.on('completed', (job) => logger.debug({ type: job.data.type }, 'Payment reconciliation job completed'));
  worker.on('failed', (job, err) => logger.error({ type: job?.data.type, err: err.message }, 'Payment reconciliation job failed'));
  return worker;
}
