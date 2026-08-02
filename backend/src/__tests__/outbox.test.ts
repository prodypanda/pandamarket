import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { outboxService, OutboxEventType } from '../services/outbox.service';
import { outboxWorker } from '../workers/outbox.worker';
import { query } from '../db/pool';

describe('Transactional Outbox Service & Worker', () => {
  const testStoreId = 'str_test_outbox_123';

  beforeAll(async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS pd_outbox_event (
        id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        aggregate_id VARCHAR(255) NOT NULL,
        revision INT NOT NULL DEFAULT 1,
        payload JSONB NOT NULL,
        idempotency_key VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        attempts INT DEFAULT 0,
        next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );
      ALTER TABLE pd_outbox_event ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
  });

  beforeEach(async () => {
    // Cleanup test outbox events
    await query('DELETE FROM pd_outbox_event WHERE aggregate_id = $1', [testStoreId]);
  });

  it('enqueues outbox events with incrementing revisions and idempotency keys', async () => {
    const event1 = await outboxService.enqueueEvent({
      eventType: OutboxEventType.STORE_PUBLISHED,
      storeId: testStoreId,
      payload: { theme_id: 'classic' },
    });

    expect(event1.id).toBeDefined();
    expect(event1.aggregate_id).toBe(testStoreId);
    expect(event1.revision).toBe(1);
    expect(event1.status).toBe('pending');
    expect(event1.idempotency_key).toContain(`${OutboxEventType.STORE_PUBLISHED}:${testStoreId}:1:`);

    const event2 = await outboxService.enqueueEvent({
      eventType: OutboxEventType.DOMAIN_CHANGED,
      storeId: testStoreId,
      payload: { custom_domain: 'maboutique.com' },
    });

    expect(event2.revision).toBe(2);
    expect(event2.idempotency_key).toContain(`${OutboxEventType.DOMAIN_CHANGED}:${testStoreId}:2:`);
  });

  it('fetches recent outbox events for store publishing status', async () => {
    await outboxService.enqueueEvent({
      eventType: OutboxEventType.STORE_PUBLISHED,
      storeId: testStoreId,
      payload: { step: 1 },
    });
    await outboxService.enqueueEvent({
      eventType: OutboxEventType.MAINTENANCE_CHANGED,
      storeId: testStoreId,
      payload: { maintenance_mode: true },
    });

    const events = await outboxService.getRecentEventsForStore(testStoreId);
    expect(events.length).toBe(2);
    expect(events[0].revision).toBe(2);
    expect(events[1].revision).toBe(1);
  });

  it('processes single outbox event and updates status to completed', async () => {
    const event = await outboxService.enqueueEvent({
      eventType: OutboxEventType.STORE_PUBLISHED,
      storeId: testStoreId,
      payload: { theme_id: 'classic' },
    });

    await outboxWorker.processSingleEvent(event);

    const { rows } = await query('SELECT * FROM pd_outbox_event WHERE id = $1', [event.id]);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].processed_at).not.toBeNull();
  });
});
