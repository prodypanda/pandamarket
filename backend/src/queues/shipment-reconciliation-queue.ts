/**
 * BullMQ queue for carrier tracking reconciliation. Jobs identify only a
 * local shipment; provider credentials are loaded by ShippingService.
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface ShipmentReconciliationJobData {
  type: 'sync_shipment' | 'sweep_due_shipments';
  shipment_id?: string;
}

export const shipmentReconciliationQueue = new Queue<ShipmentReconciliationJobData>(
  'pd_shipment_reconciliation_queue',
  {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  },
);

export async function enqueueShipmentSync(shipmentId: string, runAt?: Date): Promise<void> {
  const delay = runAt ? Math.max(0, runAt.getTime() - Date.now()) : 0;
  await shipmentReconciliationQueue.add(
    'sync_shipment',
    { type: 'sync_shipment', shipment_id: shipmentId },
    {
      ...(delay ? { delay } : {}),
      jobId: `sync-shipment-${shipmentId}-${runAt ? runAt.getTime() : 'immediate'}`,
    },
  );
}

export async function scheduleShipmentReconciliationSweep(): Promise<void> {
  await shipmentReconciliationQueue.add(
    'sweep_due_shipments',
    { type: 'sweep_due_shipments' },
    {
      repeat: { pattern: '*/10 * * * *' },
      jobId: 'recurring:shipment-reconciliation-sweep',
    },
  );
}
