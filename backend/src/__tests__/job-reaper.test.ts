import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTransaction, mockCaptureException } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockCaptureException: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: mockTransaction,
}));

vi.mock('../utils/sentry', () => ({
  captureException: mockCaptureException,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { jobReaperService } from '../services/job-reaper.service';

describe('PLAN-M-13: Background Job Reaper & Dead-Letter Queue (DLQ)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reaps stuck AI jobs and marks them failed with timeout message', async () => {
    const mockClient = {
      query: vi.fn()
        // 1. SELECT stuck jobs
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'job_stuck_1',
              store_id: 'store_1',
              user_id: 'usr_1',
              started_at: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
            },
          ],
        })
        // 2. UPDATE status = failed
        .mockResolvedValueOnce({ rowCount: 1 }),
    };

    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const result = await jobReaperService.reapStuckAiJobs(15);
    expect(result.reapedCount).toBe(1);
    expect(result.reapedJobs[0].id).toBe('job_stuck_1');

    const updateCall = mockClient.query.mock.calls[1];
    expect(updateCall[0]).toContain("status = 'failed'");
    expect(updateCall[1][0]).toContain('Job timed out after 15 minutes');
  });

  it('moves permanently failed outbox events to DLQ and alerts Sentry', async () => {
    const mockClient = {
      query: vi.fn()
        // 1. SELECT failed outbox events
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'evt_fail_1',
              event_name: 'order.placed',
              payload: { order_id: 'ord_123' },
              attempts: 5,
              last_error: 'HTTP 500 downstream webhook timeout',
            },
          ],
        })
        // 2. INSERT INTO pd_outbox_dlq
        .mockResolvedValueOnce({ rowCount: 1 })
        // 3. UPDATE pd_outbox_event SET status = 'dead_letter'
        .mockResolvedValueOnce({ rowCount: 1 }),
    };

    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const result = await jobReaperService.reapDeadOutboxEvents(5);
    expect(result.dlqCount).toBe(1);

    const insertCall = mockClient.query.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO pd_outbox_dlq');
    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
