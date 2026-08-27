import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  getPool: () => ({ query: mockQuery }),
  closePool: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  getMigrationFiles,
  assertMigrationHygiene,
  syncRenamedMigrations,
  RENAMED_MIGRATIONS,
  resolveMigrationsDir,
} from '../migrations/run';
import { logger } from '../utils/logger';

describe('PLAN-B-33: Migration Ordering & Duplicate Prefix Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies that no duplicate migration prefixes trigger warnings on the active SQL files', () => {
    const dir = resolveMigrationsDir();
    const files = getMigrationFiles(dir);

    assertMigrationHygiene(files, dir);

    // Verify logger.warn was NOT called for duplicate migration prefixes
    const warnCalls = (logger.warn as any).mock.calls;
    const duplicateWarnings = warnCalls.filter((c: any[]) =>
      String(c[1] || '').includes('Duplicate migration prefix'),
    );

    expect(duplicateWarnings.length).toBe(0);
  });

  it('synchronizes renamed migrations in pd_migrations table', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });

    await syncRenamedMigrations();

    const expectedCount = Object.keys(RENAMED_MIGRATIONS).length;
    expect(mockQuery).toHaveBeenCalledTimes(expectedCount);

    // Verify first rename query
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE pd_migrations SET id = $1 WHERE id = $2');
  });
});
