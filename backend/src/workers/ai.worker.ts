/**
 * AI worker — processes BullMQ jobs for image compression and SEO generation.
 * Started as a separate process via `npm run worker:ai`.
 */

import { Job, Worker } from 'bullmq';
import sharp from 'sharp';
import axios from 'axios';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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
import { aiConfigService } from '../services/ai-config.service';

interface AiJobData {
  job_id: string;
  store_id: string;
  type: AiJobType;
  input_url?: string | null;
  product_id?: string;
  language?: 'fr' | 'ar' | 'en';
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (!body || typeof (body as { transformToByteArray?: unknown }).transformToByteArray !== 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return Buffer.from(bytes);
}

function resolvePublicBucketKey(inputUrl: string): string | null {
  const value = inputUrl.trim();
  if (value.startsWith('/pd-product-images/')) {
    return decodeURIComponent(value.replace(/^\/pd-product-images\//, ''));
  }
  try {
    const url = new URL(value);
    const publicBase = config.s3.publicBaseUrl;
    if (publicBase.startsWith('http')) {
      const base = new URL(publicBase);
      if (url.origin === base.origin && url.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/`)) {
        return decodeURIComponent(url.pathname.slice(base.pathname.replace(/\/$/, '').length + 1));
      }
    }
    const endpoint = new URL(config.s3.endpoint);
    const publicBucketPath = `/${config.s3.bucketPublic}/`;
    if (url.origin === endpoint.origin && url.pathname.startsWith(publicBucketPath)) {
      return decodeURIComponent(url.pathname.slice(publicBucketPath.length));
    }
  } catch {
    return null;
  }
  return null;
}

async function loadImageBuffer(inputUrl: string): Promise<Buffer> {
  const publicKey = resolvePublicBucketKey(inputUrl);
  if (publicKey) {
    const object = await getS3().send(
      new GetObjectCommand({
        Bucket: config.s3.bucketPublic,
        Key: publicKey,
      }),
    );
    return streamToBuffer(object.Body);
  }

  const parsed = new URL(inputUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Image URL must be an HTTP(S) URL or a public PandaMarket asset path');
  }
  const response = await axios.get<ArrayBuffer>(inputUrl, {
    responseType: 'arraybuffer',
    timeout: 30_000,
    maxContentLength: 15 * 1024 * 1024,
    headers: { Accept: 'image/*' },
  });
  const contentType = String(response.headers['content-type'] || '');
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error('Image URL did not return an image');
  }
  return Buffer.from(response.data);
}

// ----------------------------------------------------
// Image compression
// ----------------------------------------------------

async function compressImage(job: Job<AiJobData>) {
  const { input_url, store_id, product_id } = job.data;
  if (!input_url) throw new Error('Missing input_url');

  // 1. download
  const original = await loadImageBuffer(input_url);

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
  const { product_id, language = 'fr', store_id } = job.data;
  if (!product_id) throw new Error('Missing product_id');

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

  const result = await aiConfigService.generateText(prompt, store_id);
  const text = result.text;

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
          case AiJobType.PageCopy:
            throw new Error('Page copy jobs are processed inline by the API');
          default:
            throw new Error(`Unknown job type: ${job.data.type}`);
        }
        const cost = await aiConfigService.getFeaturePrice(job.data.type);
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
