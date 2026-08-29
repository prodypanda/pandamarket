/**
 * BullMQ queue for multi-size WebP image processing and Cloudflare R2 sync.
 */

import { Queue, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';

export const IMAGE_QUEUE_NAME = 'pd_image_queue';

export interface ImageProcessingJobData {
  fileKey: string;
  bucket?: string;
  storeId?: string;
  userId?: string;
  purpose?: string;
}

export const imageQueue = new Queue<ImageProcessingJobData>(IMAGE_QUEUE_NAME, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

/**
 * Safely enqueues an image variant generation job to BullMQ.
 * Returns the created Job instance, or null if Redis queue is unavailable.
 */
export async function enqueueImageVariantGeneration(
  data: ImageProcessingJobData,
): Promise<Job<ImageProcessingJobData> | null> {
  try {
    const sanitizedKey = data.fileKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const job = await imageQueue.add('generate_variants', data, {
      jobId: `image-proc-${sanitizedKey}-${Date.now()}`,
    });
    logger.info(
      { jobId: job.id, fileKey: data.fileKey, bucket: data.bucket },
      'Enqueued image variant generation job',
    );
    return job;
  } catch (err) {
    logger.error(
      { err, fileKey: data.fileKey },
      'Failed to enqueue image variant generation job to Redis queue',
    );
    return null;
  }
}
