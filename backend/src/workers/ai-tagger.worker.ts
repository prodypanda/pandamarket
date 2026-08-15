/**
 * AI Product Tagger Worker — processes BullMQ jobs for product interest auto-tagging.
 */

import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { aiProductTaggerService } from '../services/ai-product-tagger.service';

export interface AiTaggingJobData {
  job_id?: string;
  type?: string;
  product_id?: string;
  productId?: string;
  store_id?: string;
  storeId?: string;
  force?: boolean;
}

export function startAiTaggerWorker(): Worker<AiTaggingJobData> {
  const worker = new Worker<AiTaggingJobData>(
    'pd_ai_queue',
    async (job: Job<AiTaggingJobData>) => {
      const productId = job.data.product_id || job.data.productId;
      const storeId = job.data.store_id || job.data.storeId;
      const jobType = job.data.type || job.name;

      if (jobType === 'product_tagging' || jobType === 'tag_product') {
        if (!productId) {
          throw new Error('Missing productId for product_tagging job');
        }
        logger.info({ jobId: job.id, productId, storeId }, 'Processing product auto-tagging job');
        const result = await aiProductTaggerService.tagProduct(productId, {
          force: Boolean(job.data.force),
          storeId,
        });
        return result;
      }

      if (jobType === 'nightly_sweep' || jobType === 'sweep_untagged') {
        logger.info({ jobId: job.id }, 'Processing untagged products sweep');
        const result = await aiProductTaggerService.sweepUntaggedProducts(200, Boolean(job.data.force));
        return result;
      }

      // If not a tagging job, let other workers handle it or ignore
      return { skipped: true, type: jobType };
    },
    {
      connection: getRedis(),
      concurrency: 4,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'AI tagger job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, name: job?.name, error: err.message }, 'AI tagger job failed');
  });

  return worker;
}
