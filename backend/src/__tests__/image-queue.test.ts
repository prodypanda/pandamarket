import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';

// Mock dependencies
const { mockQuery, mockQueueAdd, mockGenerateVariants } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockQueueAdd: vi.fn(),
  mockGenerateVariants: vi.fn(),
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
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
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
  pdId: vi.fn((prefix: string) => `pd_${prefix}_test123`),
}));

vi.mock('../db/redis', () => ({
  getRedis: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    on: vi.fn(),
  })),
  withRedisTimeout: vi.fn((p) => p),
}));

vi.mock('bullmq', () => {
  class MockQueue {
    name: string;
    opts: Record<string, unknown>;
    constructor(name: string, opts: Record<string, unknown>) {
      this.name = name;
      this.opts = opts;
    }
    add = mockQueueAdd;
  }

  class MockWorker {
    name: string;
    processor: (job: unknown) => Promise<unknown>;
    opts: Record<string, unknown>;
    eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

    constructor(name: string, processor: (job: unknown) => Promise<unknown>, opts: Record<string, unknown>) {
      this.name = name;
      this.processor = processor;
      this.opts = opts;
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      if (!this.eventHandlers[event]) {
        this.eventHandlers[event] = [];
      }
      this.eventHandlers[event].push(handler);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
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

  // Dummy auth middleware populating req.user if header present
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

describe('Milestone 2: BullMQ Queue, Worker & Post-Upload Processing Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  describe('1. BullMQ Image Queue Configuration & Enqueuing', () => {
    it('initializes pd_image_queue with proper BullMQ retry and retention options', () => {
      expect(IMAGE_QUEUE_NAME).toBe('pd_image_queue');
      expect(imageQueue.name).toBe('pd_image_queue');
      expect((imageQueue as any).opts.defaultJobOptions).toEqual({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      });
    });

    it('enqueueImageVariantGeneration enqueues job with correct payload and options', async () => {
      const mockJob = { id: 'image-proc-products_store_1_photo_jpg-123456789' };
      mockQueueAdd.mockResolvedValueOnce(mockJob);

      const jobData: ImageProcessingJobData = {
        fileKey: 'products/store_1/photo.jpg',
        bucket: 'pandamarket',
        storeId: 'store_1',
        userId: 'user_1',
        purpose: 'product_image',
      };

      const result = await enqueueImageVariantGeneration(jobData);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'generate_variants',
        jobData,
        expect.objectContaining({
          jobId: expect.stringMatching(/^image-proc-products_store_1_photo_jpg-\d+$/),
        }),
      );
      expect(result).toBe(mockJob);
    });

    it('enqueueImageVariantGeneration catches Redis errors safely and returns null without throwing', async () => {
      mockQueueAdd.mockRejectedValueOnce(new Error('Redis connection refused'));

      const jobData: ImageProcessingJobData = {
        fileKey: 'products/store_1/photo.jpg',
        bucket: 'pandamarket',
      };

      const result = await enqueueImageVariantGeneration(jobData);
      expect(result).toBeNull();
    });
  });

  describe('2. Image Worker Processing & Lifecycle', () => {
    it('startImageWorker starts a worker with concurrency 3 on pd_image_queue', () => {
      const worker = startImageWorker();
      expect(worker).not.toBeNull();
      expect(worker?.name).toBe('pd_image_queue');
      expect((worker as any).opts.concurrency).toBe(3);
    });

    it('processImageJob invokes imageVariantService and updates asset context when successful', async () => {
      const mockJob = {
        id: 'job_123',
        attemptsMade: 0,
        data: {
          fileKey: 'products/store_1/chair.png',
          bucket: 'pandamarket',
          storeId: 'store_1',
          userId: 'user_1',
          purpose: 'product_image',
        },
      };

      mockGenerateVariants.mockResolvedValueOnce({
        success: true,
        base_key: 'products/store_1/chair.png',
        variants_generated: [
          'products/store_1/chair_thumbnail.webp',
          'products/store_1/chair_small.webp',
          'products/store_1/chair_medium.webp',
          'products/store_1/chair_large.webp',
        ],
      });

      const summary = await processImageJob(mockJob as any);

      expect(mockGenerateVariants).toHaveBeenCalledWith('products/store_1/chair.png', 'pandamarket');
      expect(summary.success).toBe(true);
      expect(summary.variants_generated.length).toBe(4);

      // Verifies asset context update in PostgreSQL
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pd_file_asset'),
        ['store_1', 'user_1', 'product_image', 'products/store_1/chair.png', '%products/store_1/chair.png%'],
      );
    });

    it('processImageJob throws descriptive error when generation fails, enabling BullMQ retry', async () => {
      const mockJob = {
        id: 'job_failed_123',
        attemptsMade: 1,
        data: {
          fileKey: 'corrupted_image.png',
          bucket: 'pandamarket',
        },
      };

      mockGenerateVariants.mockResolvedValueOnce({
        success: false,
        base_key: 'corrupted_image.png',
        variants_generated: [],
      });

      await expect(processImageJob(mockJob as any)).rejects.toThrow(
        'Image variant generation failed or returned 0 variants for corrupted_image.png',
      );
    });

    it('worker event listeners handle completed and failed events cleanly', () => {
      const worker = startImageWorker() as any;
      expect(worker).not.toBeNull();

      // Trigger completed
      expect(() => {
        worker.emit('completed', { id: 'job_1', data: { fileKey: 'test.jpg' } }, { variants_generated: ['test_small.webp'] });
      }).not.toThrow();

      // Trigger failed
      expect(() => {
        worker.emit('failed', { id: 'job_1', data: { fileKey: 'test.jpg' }, attemptsMade: 2 }, new Error('Sharp processing failed'));
      }).not.toThrow();
    });
  });

  describe('3. Post-Upload Processing API (POST /api/pd/files/process-variants)', () => {
    const app = createApp();
    const token = signAccessToken({
      sub: 'user_123',
      role: UserRole.Vendor,
      store_id: 'store_123',
    });

    it('enqueues background job asynchronously by default (async !== false)', async () => {
      mockQueueAdd.mockResolvedValueOnce({ id: 'job_async_123' });

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: 'products/store_123/shoes.jpg',
          bucket: 'pandamarket',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.enqueued).toBe(true);
      expect(res.body.file_key).toBe('products/store_123/shoes.jpg');
      expect(res.body.variants).toEqual([
        {
          name: 'thumbnail',
          key: 'products/store_123/shoes_thumbnail.webp',
          url: expect.stringContaining('/products/store_123/shoes_thumbnail.webp'),
        },
        {
          name: 'small',
          key: 'products/store_123/shoes_small.webp',
          url: expect.stringContaining('/products/store_123/shoes_small.webp'),
        },
        {
          name: 'medium',
          key: 'products/store_123/shoes_medium.webp',
          url: expect.stringContaining('/products/store_123/shoes_medium.webp'),
        },
        {
          name: 'large',
          key: 'products/store_123/shoes_large.webp',
          url: expect.stringContaining('/products/store_123/shoes_large.webp'),
        },
      ]);
      expect(mockQueueAdd).toHaveBeenCalled();
      expect(mockGenerateVariants).not.toHaveBeenCalled();
    });

    it('processes synchronously when async is false', async () => {
      mockGenerateVariants.mockResolvedValueOnce({
        success: true,
        base_key: 'products/store_123/shoes.jpg',
        variants_generated: [
          'products/store_123/shoes_thumbnail.webp',
          'products/store_123/shoes_small.webp',
          'products/store_123/shoes_medium.webp',
          'products/store_123/shoes_large.webp',
        ],
      });

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: 'products/store_123/shoes.jpg',
          bucket: 'pandamarket',
          async: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.enqueued).toBe(false);
      expect(res.body.file_key).toBe('products/store_123/shoes.jpg');
      expect(res.body.variants_generated.length).toBe(4);
      expect(mockGenerateVariants).toHaveBeenCalledWith('products/store_123/shoes.jpg', 'pandamarket');
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('falls back to synchronous execution if BullMQ enqueue fails in async mode', async () => {
      mockQueueAdd.mockRejectedValueOnce(new Error('Redis is down'));
      mockGenerateVariants.mockResolvedValueOnce({
        success: true,
        base_key: 'products/store_123/table.jpg',
        variants_generated: ['products/store_123/table_small.webp'],
      });

      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_key: 'products/store_123/table.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.enqueued).toBe(false);
      expect(mockGenerateVariants).toHaveBeenCalled();
    });

    it('rejects unauthenticated requests to process-variants', async () => {
      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .send({
          file_key: 'products/store_123/shoes.jpg',
        });

      expect(res.status).toBe(401);
    });

    it('rejects requests with missing file_key', async () => {
      const res = await request(app)
        .post('/api/pd/files/process-variants')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
