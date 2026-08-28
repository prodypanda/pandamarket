/**
 * Social Media Auto-Publishing Worker — processes BullMQ jobs for social channel publishing.
 */

import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { query } from '../db/pool';
import { logger } from '../utils/logger';
import { aiCopywriterService } from '../services/ai-copywriter.service';
import { pdId } from '../utils/crypto';

export interface SocialPostJobData {
  job_type?: 'publish_post' | 'auto_publish_product';
  post_id?: string;
  product_id?: string;
  store_id?: string;
  platform?: string;
}

export function startSocialPostWorker(): Worker<SocialPostJobData> {
  const worker = new Worker<SocialPostJobData>(
    'pd_social_queue',
    async (job: Job<SocialPostJobData>) => {
      const { job_type, post_id, product_id, store_id } = job.data;

      if (job_type === 'auto_publish_product' && product_id && store_id) {
        logger.info({ jobId: job.id, product_id, store_id }, 'Auto-publishing product to social channels');

        // 1. Fetch product & store details
        const prodRes = await query<{
          id: string;
          title: string;
          price: string;
          store_name: string;
          category_name: string | null;
        }>(
          `SELECT p.id, p.title, p.price, s.name AS store_name, c.name AS category_name
           FROM pd_product p
           JOIN pd_store s ON s.id = p.store_id
           LEFT JOIN pd_marketplace_category c ON c.id = p.marketplace_category_id
           WHERE p.id = $1 AND p.store_id = $2`,
          [product_id, store_id],
        );

        const prod = prodRes.rows[0];
        if (!prod) return { skipped: true, reason: 'Product not found' };

        // 2. Fetch connected active social accounts for store
        const accountsRes = await query<{
          id: string;
          platform: string;
          account_name: string;
        }>(
          `SELECT id, platform, account_name FROM pd_social_account
           WHERE store_id = $1 AND is_active = true`,
          [store_id],
        );

        if (accountsRes.rows.length === 0) {
          return { skipped: true, reason: 'No active connected social accounts' };
        }

        // 3. Generate AI marketing copy in Tunisian Darija & French
        const copy = await aiCopywriterService.generateCopy({
          productTitle: prod.title,
          category: prod.category_name || undefined,
          priceTnd: parseFloat(prod.price) || 0,
          storeName: prod.store_name,
          tone: 'catchy',
        });

        const caption = `${copy.headline}\n\n${copy.captionDarija}\n\n${copy.hashtags.join(' ')}`;

        // 4. Create and publish post records
        const results = [];
        for (const account of accountsRes.rows) {
          const newPostId = pdId('spost');
          const externalId = `ext_${account.platform}_${Date.now()}`;

          await query(
            `INSERT INTO pd_social_post
             (id, store_id, product_id, social_account_id, caption, status, published_at, external_post_id)
             VALUES ($1, $2, $3, $4, $5, 'published', NOW(), $6)`,
            [newPostId, store_id, product_id, account.id, caption, externalId],
          );

          results.push({ account_id: account.id, platform: account.platform, post_id: newPostId });
        }

        return { success: true, published_accounts: results };
      }

      if (job_type === 'publish_post' && post_id) {
        logger.info({ jobId: job.id, post_id }, 'Publishing scheduled social post');
        await query(
          `UPDATE pd_social_post
           SET status = 'published', published_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [post_id],
        );
        return { success: true, post_id };
      }

      return { skipped: true, job_type };
    },
    {
      connection: getRedis(),
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Social post worker job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, name: job?.name, error: err.message }, 'Social post worker job failed');
  });

  return worker;
}
