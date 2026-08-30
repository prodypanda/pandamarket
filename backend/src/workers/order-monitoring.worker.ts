import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { OrderMonitoringJobData } from '../queues/order-monitoring-queue';
import { orderMonitoringService } from '../services/order-monitoring.service';

export function startOrderMonitoringWorker(): Worker<OrderMonitoringJobData> {
  const worker = new Worker<OrderMonitoringJobData>(
    'pd_order_monitoring_queue',
    async (job: Job<OrderMonitoringJobData>) => {
      if (job.data.type === 'sweep') {
        await orderMonitoringService.sweep();
      }
    },
    { connection: getRedis(), concurrency: 1 },
  );
  worker.on('completed', (job) => logger.debug({ type: job.data.type }, 'Order monitoring job completed'));
  worker.on('failed', (job, err) => logger.error({ type: job?.data.type, err: err.message }, 'Order monitoring job failed'));
  return worker;
}
