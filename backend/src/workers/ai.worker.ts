/**
 * AI worker — processes BullMQ jobs for image compression and SEO generation.
 * Started as a separate process via `npm run worker:ai`.
 */

import { Job, Worker } from 'bullmq';
import sharp from 'sharp';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getRedis } from '../db/redis';
import { aiService } from '../services/ai.service';
import { creditsService } from '../services/credits.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getS3, publicUrl } from '../utils/s3';
import { eventBus, PdEvent } from '../events/event-bus';
import { AiJobType } from '@pandamarket/types';
import { query } from '../db/pool';
import { pdId } from '../utils/crypto';

interface AiJobData {
  job_id: string;
  store_id: string;
  type: AiJobType;
  input_url?: string | null;
  product_id?: string;
  language?: 'fr' | 'ar' | 'en';
}

const TOKEN_COSTS: Record<AiJobType, number> = {
  [AiJobType.ImageCompression]: 1,
  [AiJobType.SeoGeneration]: 2,
};

// ----------------------------------------------------
// Image compression
// ----------------------------------------------------

async function compressImage(job: Job<AiJobData>) {
  const { input_url, store_id, product_id } = job.data;
  if (!input_url) throw new Error('Missing input_url');

  // 1. download
  const response = await axios.get<ArrayBuffer>(input_url, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  const original = Buffer.from(response.data);

  // 2. compress (preserve format, max 2000px wide)
  const meta = await sharp(original).metadata();
  const compressed = await sharp(original)
    .resize({ width: Math.min(2000, meta.width ?? 2000), withoutEnlargement: true })
    .toFormat('webp', { quality: 82 })
    .toBuffer();

  // 3. upload to S3
  const key = `ai/compressed/${store_id}/${pdId('img')}.webp`;
  await getS3().send(
    new PutObjectCommand({
      Bucket: config.s3.bucketPublic,
      Key: key,
      Body: compressed,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    }),
  );

  const outputUrl = publicUrl(key);
  if (product_id) {
    await query(
      `UPDATE pd_product_image
       SET url = $3
       WHERE product_id = $1 AND url = $2`,
      [product_id, input_url, outputUrl],
    );
    await query(
      `UPDATE pd_product
       SET thumbnail = $3
       WHERE id = $1 AND thumbnail = $2`,
      [product_id, input_url, outputUrl],
    );
  }

  return {
    output_url: outputUrl,
    original_size_bytes: original.length,
    compressed_size_bytes: compressed.length,
    saved_bytes: original.length - compressed.length,
    saved_percent: Math.round(((original.length - compressed.length) / original.length) * 100),
    width: meta.width,
    height: meta.height,
  };
}

// ----------------------------------------------------
// SEO generation
// ----------------------------------------------------

async function generateSeo(job: Job<AiJobData>) {
  const { product_id, language = 'fr' } = job.data;
  if (!product_id) throw new Error('Missing product_id');
  if (!config.gemini.apiKey) {
    throw new Error('Gemini API key not configured (PD_GEMINI_API_KEY)');
  }

  const { rows } = await query<{
    title: string;
    description: string | null;
    category: string | null;
    thumbnail: string | null;
  }>(
    `SELECT title, description, category, thumbnail FROM pd_product WHERE id = $1`,
    [product_id],
  );
  const product = rows[0];
  if (!product) throw new Error('Product not found');

  const langName = { fr: 'French', ar: 'Arabic', en: 'English' }[language];
  const prompt = `You are an e-commerce SEO expert.
Generate an optimised SEO title (max 70 chars) and meta-description (max 160 chars)
in ${langName} for this product.
Return ONLY valid JSON: { "title": string, "description": string, "tags": string[] }
Product:
- Name: ${product.title}
- Category: ${product.category ?? 'unspecified'}
- Description: ${product.description ?? '(no description provided)'}`;

  const ai = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = ai.getGenerativeModel({ model: config.gemini.model });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Try to parse JSON out of the LLM response
  let parsed: { title: string; description: string; tags: string[] };
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as typeof parsed;
  } catch {
    parsed = { title: product.title, description: '', tags: [] };
  }

  // Persist on the product
  await query(
    `UPDATE pd_product
     SET seo_title = $2, seo_description = $3, tags = $4
     WHERE id = $1`,
    [product_id, parsed.title.slice(0, 200), parsed.description.slice(0, 300), JSON.stringify(parsed.tags)],
  );
  return parsed;
}

// ----------------------------------------------------
// Worker bootstrap
// ----------------------------------------------------

export function startAiWorker(): Worker<AiJobData> {
  const worker = new Worker<AiJobData>(
    'pd_ai_queue',
    async (job) => {
      logger.info({ job_id: job.data.job_id, type: job.data.type }, 'AI job picked up');
      await aiService.markProcessing(job.data.job_id);

      try {
        let output: Record<string, unknown>;
        switch (job.data.type) {
          case AiJobType.ImageCompression:
            output = await compressImage(job);
            break;
          case AiJobType.SeoGeneration:
            output = await generateSeo(job);
            break;
          default:
            throw new Error(`Unknown job type: ${job.data.type}`);
        }
        const cost = TOKEN_COSTS[job.data.type];
        await creditsService.consume(job.data.store_id, cost);
        await aiService.markCompleted(job.data.job_id, output, cost);
        eventBus.emit(PdEvent.AI_JOB_COMPLETED, {
          job_id: job.data.job_id,
          store_id: job.data.store_id,
          type: job.data.type,
          output,
        });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await aiService.markFailed(job.data.job_id, message);
        eventBus.emit(PdEvent.AI_JOB_FAILED, {
          job_id: job.data.job_id,
          store_id: job.data.store_id,
          error: message,
        });
        throw err;
      }
    },
    { connection: getRedis(), concurrency: 4 },
  );

  worker.on('completed', (job) =>
    logger.info({ job_id: job.data.job_id }, 'AI job completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error({ job_id: job?.data.job_id, err: err.message }, 'AI job failed'),
  );
  return worker;
}
