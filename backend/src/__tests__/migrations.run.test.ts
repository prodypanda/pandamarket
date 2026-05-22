import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/pool', () => ({
  getPool: vi.fn(),
  closePool: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getMigrationFiles } from '../migrations/run';

const tempDirs: string[] = [];

function makeTempMigrationsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-migrations-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('migration runner file discovery', () => {
  it('includes regular sql migrations and skips down migrations', () => {
    const dir = makeTempMigrationsDir();
    fs.writeFileSync(path.join(dir, '002_second.sql'), '-- second');
    fs.writeFileSync(path.join(dir, '001_first.sql'), '-- first');
    fs.writeFileSync(path.join(dir, '001_first.down.sql'), '-- rollback');
    fs.writeFileSync(path.join(dir, 'README.md'), 'ignore me');

    expect(getMigrationFiles(dir)).toEqual(['001_first.sql', '002_second.sql']);
  });
});
