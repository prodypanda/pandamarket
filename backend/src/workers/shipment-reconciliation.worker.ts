import { Job, Worker } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { ShippingService, shippingService } from '../services/shipping.service';
import { ShipmentReconciliationJobData } from '../queues/shipment-reconciliation-queue';

export function startShipmentReconciliationWorker(
  service: ShippingService = shippingService,
): Worker<ShipmentReconciliationJobData> {
  const worker = new Worker<ShipmentReconciliationJobData>(
    'pd_shipment_reconciliation_queue',
    async (job: Job<ShipmentReconciliationJobData>) => {
      if (job.data.type === 'sweep_due_shipments') {
        await service.reconcileDueShipments();
      } else if (job.data.shipment_id) {
        await service.syncShipment(job.data.shipment_id);
      }
    },
    { connection: getRedis(), concurrency: 1 },
  );

  worker.on('completed', (job) => logger.debug({ type: job.data.type }, 'Shipment reconciliation job completed'));
  worker.on('failed', (job, err) => logger.error({ type: job?.data.type, err: err.message }, 'Shipment reconciliation job failed'));
  return worker;
}
