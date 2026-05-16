/**
 * AiService — orchestrates AI jobs (compression + SEO).
 *  - Verifies tokens
 *  - Creates DB job row
 *  - Enqueues into BullMQ
 *  - Workers in `src/workers/` perform the actual processing
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { creditsService } from './credits.service';
import { aiQueue } from '../queues/ai-queue';
import { PdNotFoundError, PdValidationError, PdErrorCode } from '../errors';
import { AiJobStatus, AiJobType } from '@pandamarket/types';
import { logger } from '../utils/logger';
import { aiConfigService } from './ai-config.service';

interface AiJobRow {
  id: string;
  store_id: string;
  user_id: string | null;
  type: AiJobType;
  status: AiJobStatus;
  input_url: string | null;
  input_meta: Record<string, unknown>;
  output: Record<string, unknown> | null;
  tokens_consumed: number;
  error_message: string | null;
  bullmq_job_id: string | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

interface AiJobListOptions {
  page?: number;
  limit?: number;
  type?: AiJobType;
  status?: AiJobStatus;
}

export class AiService {
  /**
   * Queue an image compression job.
   */
  async queueImageCompression(opts: {
    store_id: string;
    user_id: string;
    image_url: string;
    product_id?: string;
  }): Promise<AiJobRow> {
    if (!opts.image_url) throw new PdValidationError('image_url is required');
    return this.queueJob({
      type: AiJobType.ImageCompression,
      store_id: opts.store_id,
      user_id: opts.user_id,
      input_url: opts.image_url,
      input_meta: { product_id: opts.product_id ?? null },
    });
  }

  /**
   * Queue an SEO generation job.
   */
  async queueSeoGeneration(opts: {
    store_id: string;
    user_id: string;
    product_id: string;
    language?: 'fr' | 'ar' | 'en';
  }): Promise<AiJobRow> {
    return this.queueJob({
      type: AiJobType.SeoGeneration,
      store_id: opts.store_id,
      user_id: opts.user_id,
      input_url: null,
      input_meta: { product_id: opts.product_id, language: opts.language ?? 'fr' },
    });
  }

  async startInlineJob(opts: {
    type: AiJobType.PageCopy | AiJobType.ProductDescription;
    store_id: string;
    user_id: string;
    input_meta: Record<string, unknown>;
  }): Promise<AiJobRow> {
    const cost = await aiConfigService.getFeaturePrice(opts.type);
    await creditsService.assertEnough(opts.store_id, cost);
    const id = pdId('aijob');
    const { rows } = await query<AiJobRow>(
      `INSERT INTO pd_ai_jobs
        (id, store_id, user_id, type, status, input_meta, started_at)
       VALUES ($1, $2, $3, $4, 'processing', $5, NOW())
       RETURNING *`,
      [id, opts.store_id, opts.user_id, opts.type, JSON.stringify(opts.input_meta)],
    );
    logger.info({ ai_job_id: id, type: opts.type }, 'AI inline job started');
    return rows[0];
  }

  async getById(id: string): Promise<AiJobRow> {
    const { rows } = await query<AiJobRow>('SELECT * FROM pd_ai_jobs WHERE id = $1', [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.AI_JOB_NOT_FOUND, 'AI job not found');
    return rows[0];
  }

  async listByStore(storeId: string, opts: AiJobListOptions = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [storeId];
    let where = 'store_id = $1';
    if (opts.type) {
      params.push(opts.type);
      where += ` AND type = $${params.length}`;
    }
    if (opts.status) {
      params.push(opts.status);
      where += ` AND status = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await query<AiJobRow>(
      `SELECT * FROM pd_ai_jobs WHERE ${where}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_ai_jobs WHERE ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * Update job status from worker.
   */
  async markProcessing(jobId: string): Promise<void> {
    await query(
      `UPDATE pd_ai_jobs SET status = 'processing', started_at = NOW() WHERE id = $1`,
      [jobId],
    );
  }

  async markCompleted(
    jobId: string,
    output: Record<string, unknown>,
    tokensConsumed: number,
  ): Promise<void> {
    await query(
      `UPDATE pd_ai_jobs
       SET status = 'completed', output = $2,
           tokens_consumed = $3, completed_at = NOW()
       WHERE id = $1`,
      [jobId, JSON.stringify(output), tokensConsumed],
    );
  }

  async markFailed(jobId: string, error: string): Promise<void> {
    await query(
      `UPDATE pd_ai_jobs
       SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1`,
      [jobId, error],
    );
  }

  // ----------------------------------------------------------------
  // internals
  // ----------------------------------------------------------------

  private async queueJob(opts: {
    type: AiJobType;
    store_id: string;
    user_id: string;
    input_url: string | null;
    input_meta: Record<string, unknown>;
  }): Promise<AiJobRow> {
    const cost = await aiConfigService.getFeaturePrice(opts.type);
    await creditsService.assertEnough(opts.store_id, cost);

    const id = pdId('aijob');
    const { rows } = await query<AiJobRow>(
      `INSERT INTO pd_ai_jobs
        (id, store_id, user_id, type, input_url, input_meta)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, opts.store_id, opts.user_id, opts.type, opts.input_url, JSON.stringify(opts.input_meta)],
    );

    const bullJob = await aiQueue.add(
      opts.type,
      { job_id: id, store_id: opts.store_id, type: opts.type, ...opts.input_meta, input_url: opts.input_url },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
    );

    await query(`UPDATE pd_ai_jobs SET bullmq_job_id = $2 WHERE id = $1`, [
      id,
      bullJob.id,
    ]);

    logger.info({ ai_job_id: id, type: opts.type }, 'AI job queued');
    return rows[0];
  }
}

export const aiService = new AiService();
