/**
 * Repeatable queue driving the order-domain monitoring sweep.
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface OrderMonitoringJobData {
  type: 'sweep';
}

export const orderMonitoringQueue = new Queue<OrderMonitoringJobData>(
  'pd_order_monitoring_queue',
  {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  },
);

export async function scheduleOrderMonitoringSweep(intervalMinutes = 15): Promise<void> {
  await orderMonitoringQueue.add(
    'sweep',
    { type: 'sweep' },
    {
      repeat: { pattern: `*/${intervalMinutes} * * * *` },
      jobId: 'recurring-order-monitoring-sweep',
    },
  );
}
