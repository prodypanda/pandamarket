/**
 * Image processing worker — processes multi-size WebP generation jobs from BullMQ.
 */

import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { IMAGE_QUEUE_NAME, ImageProcessingJobData } from '../queues/image-queue';
import { imageVariantService, GenerationSummary } from '../services/image-variant.service';
import { query } from '../db/pool';
import { logger } from '../utils/logger';

const log = logger.child({ worker: 'image' });

/**
 * Core processor for image variant generation jobs.
 */
export async function processImageJob(
  job: Job<ImageProcessingJobData>,
): Promise<GenerationSummary> {
  const { fileKey, bucket, storeId, userId, purpose } = job.data;
  log.info(
    { jobId: job.id, fileKey, bucket, attempt: (job.attemptsMade ?? 0) + 1 },
    'Processing image variant job',
  );

  const summary = await imageVariantService.generateVariantsForFileKey(fileKey, bucket);

  if (!summary.success || summary.variants_generated.length === 0) {
    const errorMsg = `Image variant generation failed or returned 0 variants for ${fileKey}`;
    log.error(
      { jobId: job.id, fileKey, bucket, attemptsMade: job.attemptsMade },
      errorMsg,
    );
    throw new Error(errorMsg);
  }

  // Update pd_file_asset if additional job context is present
  if (storeId || userId || purpose) {
    try {
      await query(
        `UPDATE pd_file_asset
         SET store_id = COALESCE(store_id, $1),
             owner_user_id = COALESCE(owner_user_id, $2),
             purpose = COALESCE(purpose, $3),
             updated_at = NOW()
         WHERE file_key = $4 OR file_key LIKE $5`,
        [storeId ?? null, userId ?? null, purpose ?? null, fileKey, `%${fileKey}%`],
      );
    } catch (dbErr) {
      log.warn({ err: dbErr, fileKey }, 'Failed to update pd_file_asset context in worker');
    }
  }

  log.info(
    {
      jobId: job.id,
      fileKey,
      variantsCount: summary.variants_generated.length,
      variants: summary.variants_generated,
    },
    'Image variant generation job completed successfully',
  );

  return summary;
}

/**
 * Starts the BullMQ Image Worker.
 */
export function startImageWorker(): Worker<ImageProcessingJobData, GenerationSummary> | null {
  try {
    const worker = new Worker<ImageProcessingJobData, GenerationSummary>(
      IMAGE_QUEUE_NAME,
      async (job) => {
        return await processImageJob(job);
      },
      {
        connection: getRedis(),
        concurrency: 3,
      },
    );

    worker.on('completed', (job, result) => {
      log.info(
        { jobId: job?.id, fileKey: job?.data?.fileKey, variants: result?.variants_generated },
        'Image variant job completed',
      );
    });

    worker.on('failed', (job, err) => {
      log.error(
        {
          jobId: job?.id,
          fileKey: job?.data?.fileKey,
          attemptsMade: job?.attemptsMade,
          error: err.message,
        },
        'Image variant job failed',
      );
    });

    log.info('Image processing worker started (concurrency: 3)');
    return worker;
  } catch (err) {
    log.error({ err }, 'Failed to start image processing worker');
    return null;
  }
}
