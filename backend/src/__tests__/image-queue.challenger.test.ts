import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';

// Mock dependencies hoisted
const { mockQuery, mockQueueAdd, mockGenerateVariants, mockGetRedis } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockQueueAdd: vi.fn(),
  mockGenerateVariants: vi.fn(),
  mockGetRedis: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
    })),
  },
  childLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('../services/system-log.service', () => ({
  systemLogService: {
    captureError: vi.fn(),
  },
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `pd_${prefix}_challenger123`),
}));

vi.mock('../db/redis', () => ({
  getRedis: () => mockGetRedis(),
  withRedisTimeout: vi.fn((p) => p),
}));

vi.mock('bullmq', () => {
  class MockQueue {
    name: string;
    opts: Record<string, any>;
    constructor(name: string, opts: Record<string, any>) {
      this.name = name;
      this.opts = opts;
    }
    add = mockQueueAdd;
  }

  class MockWorker {
    name: string;
    processor: (job: any) => Promise<any>;
    opts: Record<string, any>;
    eventHandlers: Record<string, ((...args: any[]) => void)[]> = {};

    constructor(name: string, processor: (job: any) => Promise<any>, opts: Record<string, any>) {
      this.name = name;
      this.processor = processor;
      this.opts = opts;
    }

    on(event: string, handler: (...args: any[]) => void) {
      if (!this.eventHandlers[event]) {
        this.eventHandlers[event] = [];
      }
      this.eventHandlers[event].push(handler);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const handlers = this.eventHandlers[event] || [];
      handlers.forEach((h) => h(...args));
    }

    close = vi.fn().mockResolvedValue(undefined);
  }

  return {
    Queue: MockQueue,
    Worker: MockWorker,
  };
});

vi.mock('../services/image-variant.service', () => ({
  imageVariantService: {
    generateVariantsForFileKey: (...args: unknown[]) => mockGenerateVariants(...args),
    getBaseKeyAndExtension: (rawKey: string, bucket?: string) => {
      let cleanKey = rawKey.replace(/^\/+/, '');
      if (bucket && cleanKey.startsWith(`${bucket}/`)) {
        cleanKey = cleanKey.substring(bucket.length + 1);
      }
      cleanKey = cleanKey.replace(/^(pd-product-images|pd-private-files|pd-themes|pandamarket)\//, '');
      const lastDotIndex = cleanKey.lastIndexOf('.');
      const base = lastDotIndex > -1 ? cleanKey.substring(0, lastDotIndex) : cleanKey;
      const ext = lastDotIndex > -1 ? cleanKey.substring(lastDotIndex + 1) : 'webp';
      return { baseKeyWithoutExt: base, ext };
    },
    getVariantKey: (baseKeyWithoutExt: string, preset: string) => `${baseKeyWithoutExt}_${preset}.webp`,
  },
}));

import {
  imageQueue,
  IMAGE_QUEUE_NAME,
  enqueueImageVariantGeneration,
  ImageProcessingJobData,
} from '../queues/image-queue';
import { startImageWorker, processImageJob } from '../workers/image.worker';
import filesRouter from '../api/files.route';
import { errorHandler } from '../middlewares';
import { signAccessToken } from '../utils/jwt';

function createApp() {
  const app = express();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    const authHeader = req.headers['x-test-user'];
    if (authHeader) {
      req.user = JSON.parse(authHeader as string);
    }
    next();
  });

  const apiRouter = express.Router();
  apiRouter.use('/files', filesRouter);
  app.use('/api/pd', apiRouter);
  app.use(errorHandler);
  return app;
}

describe('CHALLENGER ADVERSARIAL STRESS SUITE: Milestone 2 BullMQ Pipeline & Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRedis.mockReturnValue({
      ping: vi.fn().mockResolvedValue('PONG'),
      on: vi.fn(),
    });
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  describe('1. High-Volume Job Burst Stress Testing (50+ Simultaneous Jobs)', () => {
    it('handles 50 simultaneous enqueueImageVariantGeneration calls with unique job IDs and zero drops', async () => {
      const jobCount = 50;
      const enqueuedJobs: any[] = [];

      mockQueueAdd.mockImplementation(async (jobName, data, opts) => {
        const job = { id: opts.jobId, name: jobName, data };
        enqueuedJobs.push(job);
        return job;
      });

      const promises = Array.from({ length: jobCount }, (_, i) => {
        const jobData: ImageProcessingJobData = {
          fileKey: `products/store_burst/item_${i.toString().padStart(3, '0')}.jpg`,
          bucket: 'pandamarket',
          storeId: 'store_burst',
          userId: `user_${i}`,
          purpose: 'product_image',
        };
        return enqueueImageVariantGeneration(jobData);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(jobCount);
      expect(results.every((res) => res !== null)).toBe(true);
      expect(mockQueueAdd).toHaveBeenCalledTimes(jobCount);

      // Verify each job has a distinct unique jobId
      const jobIds = results.map((r) => r!.id);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(jobCount);

      // Verify job ID format contains sanitized key
      results.forEach((r, idx) => {
        expect(r!.id).toContain(`products_store_burst_item_${idx.toString().padStart(3, '0')}_jpg`);
      });
    });

    it('processes 50 concurrent jobs through processImageJob worker processor without race conditions', async () => {
      const jobCount = 50;

      mockGenerateVariants.mockImplementation(async (fileKey: string) => ({
        success: true,
        base_key: fileKey,
        variants_generated: [
          `${fileKey}_thumbnail.webp`,
          `${fileKey}_small.webp`,
          `${fileKey}_medium.webp`,
          `${fileKey}_large.webp`,
        ],
      }));

      const mockJobs = Array.from({ length: jobCount }, (_, i) => ({
        id: `job_burst_${i}`,
        attemptsMade: 0,
        data: {
          fileKey: `products/store_999/product_${i}.png`,
          bucket: 'pandamarket',
          storeId: 'store_999',
          userId: `vendor_user_${i}`,
          purpose: 'product_image',
        },
      }));

      // Simulate concurrent batch processing with Promise.all
      const results = await Promise.all(mockJobs.map((job) => processImageJob(job as any)));

      expect(results).toHaveLength(jobCount);
      expect(mockGenerateVariants).toHaveBeenCalledTimes(jobCount);
      expect(mockQuery).toHaveBeenCalledTimes(jobCount);

      results.forEach((summary, idx) => {
        expect(summary.success).toBe(true);
        expect(summary.variants_generated.length).toBe(4);
        expect(summary.base_key).toBe(`products/store_999/product_${idx}.png`);
      });
    });

    it('handles 50 concurrent HTTP POST requests to /api/pd/files/process-variants', async () => {
      const app = createApp();
      const token = signAccessToken({
        sub: 'user_burst_test',
        role: UserRole.Vendor,
        store_id: 'store_burst',
      });

      mockQueueAdd.mockImplementation(async (_name, _data, opts) => ({
        id: opts.jobId,
      }));

      const burstRequests = Array.from({ length: 50 }, (_, i) => {
        return request(app)
          .post('/api/pd/files/process-variants')
          .set('Authorization', `Bearer ${token}`)
          .send({
            file_key: `products/store_burst/burst_photo_${i}.jpg`,
            bucket: 'pandamarket',
          });
      });

      const responses = await Promise.all(burstRequests);

      expect(responses).toHaveLength(50);
      responses.forEach((res, i) => {
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.enqueued).toBe(true);
        expect(res.body.file_key).toBe(`products/store_burst/burst_photo_${i}.jpg`);
        expect(res.body.variants).toHaveLength(4);
      });
      expect(mockQueueAdd).toHaveBeenCalledTimes(50);
    });
  });

  describe('2. Redis Downtime & Connection Failure Simulation (Fallback Verification)', () => {
    it('gracefully catches Redis ECONNREFUSED error and returns null from enqueueImageVariantGeneration', async () => {
      mockQueueAdd.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:6379'));

      const result = await enqueueImageVariantGeneration({
        fileKey: 'products/store_1/table.jpg',
      });

      expect(result).toBeNull();
    });

    it('gracefully catches Redis ETIMEDOUT / timeout error and returns null', async () => {
      mockQueueAdd.mockRejectedValueOnce(new Error('Redis command timed out after 5000ms'));

      const result = await enqueueImageVariantGeneration({
        fileKey: 'products/store_1/table.jpg',
      });

      expect(result).toBeNull();
    });

    it('falls back to synchronous variant generation on POST /process-variants when Redis is down', async () => {
      const app = createApp();
      const token = signAccessToken({
        sub: 'user_resilience_test',
        role: UserRole.Vendor,
        store_id: 'store_resilience',
      });

      // Simulate Redis queue failure
      mockQueueAdd.mockRejectedValueOnce(new Error('Redis cluster is unreachable'));

      mockGenerateVariants.mockResolvedValueOnce({
        success: true,
        base_key: 'products/store_resilience/chair.png',
        variants_generated: [
          'products/store_resilience/chair_thumbnail.webp',
          'products/store_resilience/chair_small.webp',
          'products/store_resilience/chair_medium.webp',
          'products/store_resilience/chair_large.webp',
        ],
      });

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: 'products/store_resilience/chair.png',
          bucket: 'pandamarket',
        });

      // API must NOT return 500; it must fall back synchronously and return 200
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.enqueued).toBe(false);
      expect(res.body.file_key).toBe('products/store_resilience/chair.png');
      expect(res.body.variants_generated).toHaveLength(4);
      expect(mockGenerateVariants).toHaveBeenCalledWith(
        'products/store_resilience/chair.png',
        'pandamarket',
      );
    });

    it('startImageWorker handles worker instantiation error safely and returns null', () => {
      mockGetRedis.mockImplementationOnce(() => {
        throw new Error('Fatal Redis connection fault during worker init');
      });

      const worker = startImageWorker();
      expect(worker).toBeNull();
    });
  });

  describe('3. Worker Failure, Retry Behavior & Exponential Backoff Verification', () => {
    it('verifies BullMQ Queue defaultJobOptions adhere strictly to exponential backoff and retry policy', () => {
      const defaultJobOptions = (imageQueue as any).opts?.defaultJobOptions;

      expect(defaultJobOptions).toBeDefined();
      expect(defaultJobOptions.attempts).toBe(3);
      expect(defaultJobOptions.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      });
      expect(defaultJobOptions.removeOnComplete).toEqual({ count: 1000 });
      expect(defaultJobOptions.removeOnFail).toEqual({ count: 5000 });
    });

    it('calculates theoretical exponential backoff progression accurately (delay * 2^(attempt-1))', () => {
      const baseDelay = (imageQueue as any).opts?.defaultJobOptions?.backoff?.delay ?? 2000;

      const attempt1Delay = baseDelay * Math.pow(2, 0); // 2000ms
      const attempt2Delay = baseDelay * Math.pow(2, 1); // 4000ms
      const attempt3Delay = baseDelay * Math.pow(2, 2); // 8000ms

      expect(attempt1Delay).toBe(2000);
      expect(attempt2Delay).toBe(4000);
      expect(attempt3Delay).toBe(8000);
    });

    it('throws Error in processImageJob when imageVariantService returns success: false', async () => {
      const mockJob = {
        id: 'job_fail_1',
        attemptsMade: 0,
        data: {
          fileKey: 'corrupted/test.png',
          bucket: 'pandamarket',
        },
      };

      mockGenerateVariants.mockResolvedValueOnce({
        success: false,
        base_key: 'corrupted/test.png',
        variants_generated: [],
      });

      await expect(processImageJob(mockJob as any)).rejects.toThrow(
        /Image variant generation failed or returned 0 variants for corrupted\/test\.png/,
      );
    });

    it('throws Error in processImageJob when imageVariantService returns 0 variants', async () => {
      const mockJob = {
        id: 'job_fail_2',
        attemptsMade: 1,
        data: {
          fileKey: 'empty/test.png',
          bucket: 'pandamarket',
        },
      };

      mockGenerateVariants.mockResolvedValueOnce({
        success: true,
        base_key: 'empty/test.png',
        variants_generated: [],
      });

      await expect(processImageJob(mockJob as any)).rejects.toThrow(
        /Image variant generation failed or returned 0 variants for empty\/test\.png/,
      );
    });

    it('propagates underlying Sharp or S3 errors in processImageJob for BullMQ retry triggering', async () => {
      const mockJob = {
        id: 'job_fail_sharp',
        attemptsMade: 2,
        data: {
          fileKey: 'unreadable.raw',
          bucket: 'pandamarket',
        },
      };

      mockGenerateVariants.mockRejectedValueOnce(
        new Error('VipsJpeg: Premature end of JPEG file'),
      );

      await expect(processImageJob(mockJob as any)).rejects.toThrow(
        'VipsJpeg: Premature end of JPEG file',
      );
    });

    it('does not fail job if metadata database update throws an error (non-fatal warning)', async () => {
      const mockJob = {
        id: 'job_db_err',
        attemptsMade: 0,
        data: {
          fileKey: 'products/store_1/table.png',
          bucket: 'pandamarket',
          storeId: 'store_1',
          userId: 'user_1',
          purpose: 'product_image',
        },
      };

      mockGenerateVariants.mockResolvedValueOnce({
        success: true,
        base_key: 'products/store_1/table.png',
        variants_generated: [
          'products/store_1/table_thumbnail.webp',
          'products/store_1/table_small.webp',
          'products/store_1/table_medium.webp',
          'products/store_1/table_large.webp',
        ],
      });

      // Simulate database connection glitch during pd_file_asset update
      mockQuery.mockRejectedValueOnce(new Error('PostgreSQL connection terminated unexpectedly'));

      const summary = await processImageJob(mockJob as any);

      expect(summary.success).toBe(true);
      expect(summary.variants_generated.length).toBe(4);
    });
  });

  describe('4. Asynchronous Post-Upload API Responses & Payload Validation', () => {
    const app = createApp();
    const token = signAccessToken({
      sub: 'vendor_user_payload_test',
      role: UserRole.Vendor,
      store_id: 'store_payload_test',
    });

    it('verifies generated variant URLs format correctly with CDN domain and 4 standard presets', async () => {
      mockQueueAdd.mockResolvedValueOnce({ id: 'job_cdn_test' });

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: 'products/store_payload_test/laptop.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.enqueued).toBe(true);
      expect(res.body.variants).toEqual([
        {
          name: 'thumbnail',
          key: 'products/store_payload_test/laptop_thumbnail.webp',
          url: expect.stringMatching(/https:\/\/[^/]+\/products\/store_payload_test\/laptop_thumbnail\.webp/),
        },
        {
          name: 'small',
          key: 'products/store_payload_test/laptop_small.webp',
          url: expect.stringMatching(/https:\/\/[^/]+\/products\/store_payload_test\/laptop_small\.webp/),
        },
        {
          name: 'medium',
          key: 'products/store_payload_test/laptop_medium.webp',
          url: expect.stringMatching(/https:\/\/[^/]+\/products\/store_payload_test\/laptop_medium\.webp/),
        },
        {
          name: 'large',
          key: 'products/store_payload_test/laptop_large.webp',
          url: expect.stringMatching(/https:\/\/[^/]+\/products\/store_payload_test\/laptop_large\.webp/),
        },
      ]);
    });

    it('handles complex nested keys with leading slashes, bucket prefixes, and multi-dot filenames', async () => {
      mockQueueAdd.mockResolvedValueOnce({ id: 'job_nested_key' });

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: '/pd-product-images/stores/s123/categories/electronics/item.v2.preview.png',
          bucket: 'pandamarket',
        });

      expect(res.status).toBe(200);
      expect(res.body.variants[0].key).toBe(
        'stores/s123/categories/electronics/item.v2.preview_thumbnail.webp',
      );
      expect(res.body.variants[1].key).toBe(
        'stores/s123/categories/electronics/item.v2.preview_small.webp',
      );
    });

    it('respects explicit async: false flag and executes synchronous generation pipeline', async () => {
      mockGenerateVariants.mockResolvedValueOnce({
        success: true,
        base_key: 'products/s1/phone.jpg',
        variants_generated: [
          'products/s1/phone_thumbnail.webp',
          'products/s1/phone_small.webp',
          'products/s1/phone_medium.webp',
          'products/s1/phone_large.webp',
        ],
      });

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: 'products/s1/phone.jpg',
          bucket: 'pandamarket',
          async: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.enqueued).toBe(false);
      expect(mockQueueAdd).not.toHaveBeenCalled();
      expect(mockGenerateVariants).toHaveBeenCalledWith('products/s1/phone.jpg', 'pandamarket');
    });

    it('rejects request with 401 Unauthorized when missing Authorization header', async () => {
      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .send({
          file_key: 'products/s1/unauth.jpg',
        });

      expect(res.status).toBe(401);
    });

    it('rejects request with 400 Bad Request when file_key is empty string or missing', async () => {
      const res1 = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: '',
        });

      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res2.status).toBe(400);
    });

    it('rejects request with 400 Bad Request when file_key exceeds 1024 characters', async () => {
      const excessivelyLongKey = 'a'.repeat(1025);

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: excessivelyLongKey,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('5. Dual Runtime Execution & Worker Registration', () => {
    it('verifies worker concurrency setting is exactly 3', () => {
      const worker = startImageWorker();
      expect(worker).not.toBeNull();
      expect((worker as any).opts.concurrency).toBe(3);
      expect((worker as any).name).toBe(IMAGE_QUEUE_NAME);
    });
  });
});
