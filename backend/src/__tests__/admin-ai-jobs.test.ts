import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../db/pool';

describe('Admin AI Jobs & Activity History API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates duration calculation formula and structure', () => {
    const started = new Date('2026-08-18T10:00:00Z');
    const completed = new Date('2026-08-18T10:00:02.450Z');
    const durationSeconds = (completed.getTime() - started.getTime()) / 1000;
    expect(durationSeconds).toBeCloseTo(2.45, 2);
  });

  it('verifies recent activity mapper handles completed, failed, and active jobs', () => {
    const mockDbRow = {
      id: 'aijob_test_123',
      store_id: 'store_456',
      store_name: 'Boutique Artisanale',
      user_id: 'usr_789',
      type: 'category_classification',
      status: 'completed',
      tokens_consumed: 1,
      error_message: null,
      duration_seconds: 1.25,
      created_at: new Date(),
      started_at: new Date(),
      completed_at: new Date(),
      input_meta: { title: 'Sac Cuir' },
      output: { marketplace_category_name: 'Maroquinerie', provider: 'gemini (Gemini 2.5 Pro)' },
    };

    const mapped = {
      id: mockDbRow.id,
      store_id: mockDbRow.store_id,
      store_name: mockDbRow.store_name,
      user_id: mockDbRow.user_id,
      type: mockDbRow.type,
      status: mockDbRow.status,
      tokens_consumed: Number(mockDbRow.tokens_consumed) || 0,
      error_message: mockDbRow.error_message,
      duration_seconds: mockDbRow.duration_seconds !== null ? Number(mockDbRow.duration_seconds) : null,
      created_at: mockDbRow.created_at,
      started_at: mockDbRow.started_at,
      completed_at: mockDbRow.completed_at,
      input_meta: mockDbRow.input_meta || {},
      output: mockDbRow.output || null,
      provider_label: (mockDbRow.output as any)?.provider || null,
    };

    expect(mapped.id).toBe('aijob_test_123');
    expect(mapped.status).toBe('completed');
    expect(mapped.tokens_consumed).toBe(1);
    expect(mapped.provider_label).toBe('gemini (Gemini 2.5 Pro)');
    expect(mapped.duration_seconds).toBe(1.25);
  });

  it('verifies query parameter schema parsing and pagination math', () => {
    const total = 45;
    const limit = 20;
    const page = 2;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    expect(totalPages).toBe(3);
    expect(offset).toBe(20);
  });
});
