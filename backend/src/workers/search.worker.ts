/**
 * Search reindex worker — processes search reindex jobs from BullMQ.
 *
 * Schedules:
 * - `full_reindex`: Can be triggered manually by admin or on Meilisearch recovery
 * - Repeatable: Daily consistency check at 03:00 UTC
 */

import { Worker } from 'bullmq';
import { getRedis } from '../db/redis';
import { searchQueue } from '../queues/search-queue';
import { runSearchJob } from './search-runner';
import { logger } from '../utils/logger';

const log = logger.child({ worker: 'search' });

export function startSearchWorker(): Worker {
  const worker = new Worker(
    'pd_search_queue',
    async (job) => {
      log.info({ jobId: job.id, type: job.data.type }, 'Processing search job');
      const result = await runSearchJob(job.data);
      log.info({ jobId: job.id, ...result }, 'Search job completed');
      return result;
    },
    {
      connection: getRedis(),
      concurrency: 1, // Only one reindex at a time
      limiter: {
        max: 1,
        duration: 60_000, // Max 1 job per minute to avoid overloading Meilisearch
      },
    },
  );

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, error: err.message }, 'Search job failed');
  });

  // Schedule daily consistency reindex at 03:00 UTC
  searchQueue.add(
    'daily_reindex',
    { type: 'full_reindex' },
    {
      repeat: { pattern: '0 3 * * *' },
      jobId: 'daily-search-reindex',
    },
  ).catch((err) => {
    log.warn({ error: err.message }, 'Failed to schedule daily reindex (may already exist)');
  });

  log.info('Search reindex worker started');
  return worker;
}
