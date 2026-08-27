import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockGetHostnames } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockGetHostnames: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
}));

vi.mock('../services/outbox.service', () => ({
  outboxService: {
    getStoreHostnames: mockGetHostnames,
  },
}));

vi.mock('../queues/webhook-queue', () => ({
  webhookQueue: {
    add: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../events/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { outboxWorker } from '../workers/outbox.worker';

describe('PLAN-B-22: Outbox Worker Atomic Claim & Lease Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs lease recovery sweep and atomically claims pending events with SKIP LOCKED', async () => {
    const eventRow = {
      id: 'outbox_1',
      event_type: 'store.updated',
      aggregate_id: 'store_123',
      revision: 2,
      payload: { name: 'New Name' },
      idempotency_key: 'key_123',
      status: 'processing',
      attempts: 1,
    };

    // 1. Lease recovery query
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // 2. Atomic claim with SKIP LOCKED
    mockQuery.mockResolvedValueOnce({ rows: [eventRow] });
    // 3. Mark completed query inside processSingleEvent
    mockQuery.mockResolvedValueOnce({ rows: [] });

    mockGetHostnames.mockResolvedValueOnce(['store1.pandamarket.tn']);

    const count = await outboxWorker.processPendingEvents();

    expect(count).toBe(1);

    // Verify lease recovery query was run first
    expect(mockQuery.mock.calls[0][0]).toContain("status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes'");

    // Verify atomic claim query uses FOR UPDATE SKIP LOCKED
    expect(mockQuery.mock.calls[1][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(mockQuery.mock.calls[1][0]).toContain('RETURNING *');

    // Verify completion update
    expect(mockQuery.mock.calls[2][0]).toContain("SET status = 'completed'");
  });
});
