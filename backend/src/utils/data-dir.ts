/**
 * Resolves the backend `data/` directory reliably in both dev and prod.
 *
 * In dev (`tsx src/main.ts`) __dirname is `backend/src/utils`.
 * In production the compiled output lives at `backend/dist/backend/src/utils`
 * (the extra `backend/` segment exists because the shared `packages/types`
 * sources are part of the compilation root). A hardcoded relative path
 * therefore breaks in one of the two modes - this helper walks up from
 * __dirname until it finds the real data directory.
 *
 * Can be overridden explicitly with the PD_DATA_DIR env var.
 */

import * as fs from 'fs';
import * as path from 'path';

let cached: string | null = null;

export function getDataDir(): string {
  if (cached) return cached;

  if (process.env.PD_DATA_DIR) {
    cached = path.resolve(process.env.PD_DATA_DIR);
    return cached;
  }

  // Walk up from this file until we find a `data` dir containing the
  // committed pd-product-images folder (works for src/ and dist/backend/src/).
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'data');
    if (fs.existsSync(path.join(candidate, 'pd-product-images'))) {
      cached = candidate;
      return cached;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Last resort: assume the process was started from the backend package dir.
  cached = path.resolve(process.cwd(), 'data');
  return cached;
}

/**
 * Safely resolve a file path inside the data directory.
 * Throws if the resolved path escapes the data dir (path traversal).
 */
export function resolveDataPath(...segments: string[]): string {
  const dataDir = getDataDir();
  const resolved = path.resolve(dataDir, ...segments);
  if (resolved !== dataDir && !resolved.startsWith(dataDir + path.sep)) {
    throw new Error('Invalid file path');
  }
  return resolved;
}
