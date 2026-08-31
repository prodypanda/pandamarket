/**
 * Real-PostgreSQL truth-table test for the multi-vendor order aggregate.
 *
 * Runs the actual syncOrderStatusFromFulfillments statement against the dev
 * database for every combination that matters, proving the ladder end-to-end
 * (including the two partial states and the payment_required fallback).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { syncOrderStatusFromFulfillments } from '../services/order-fulfillment-shared';

const DB_URL =
  process.env.PD_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://pd_user:pd_password@localhost:5432/pandamarket';

let client: Client | null = null;
let dbAvailable = false;

const USER = 'user_mvtest';
const STORE_A = 'store_mvtest_a';
const STORE_B = 'store_mvtest_b';
const ORDER = 'ord_mvtest_1';
const FUL_A = 'ful_mvtest_a';
const FUL_B = 'ful_mvtest_b';

function requireDb(): void {
  if (!dbAvailable) throw new Error('dev database unavailable');
}

beforeAll(async () => {
  client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await cleanup();
    await seed();
    dbAvailable = true;
  } catch (err) {
    dbAvailable = false;
    console.error('[multi-vendor-status.integration] db unavailable or seed failed:', err);
  }
});

afterAll(async () => {
  if (dbAvailable) await cleanup();
  await client?.end().catch(() => {});
});

async function seed(): Promise<void> {
  await client!.query(
    `INSERT INTO pd_user (id, email, password_hash, role, first_name, last_name)
     VALUES ($1, 'mvtest@pandamarket.test', 'x', 'customer', 'MV', 'Test')`,
    [USER],
  );
  await client!.query(
    `INSERT INTO pd_store (id, owner_id, name, subdomain, status, is_verified)
     VALUES ($1, $3, 'MV A', 'mvtest-a', 'verified', true),
            ($2, $3, 'MV B', 'mvtest-b', 'verified', true)`,
    [STORE_A, STORE_B, USER],
  );
  await client!.query(
    `INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status,
                           subtotal, shipping_total, total, currency)
     VALUES ($1, $2, 'pending', 'flouci', 'captured', 100, 7, 107, 'TND')`,
    [ORDER, USER],
  );
  await client!.query(
    `INSERT INTO pd_fulfillment (id, order_id, store_id, status, shipping_total)
     VALUES ($1, $3, $4, 'pending', 3.5), ($2, $3, $5, 'pending', 3.5)`,
    [FUL_A, FUL_B, ORDER, STORE_A, STORE_B],
  );
}

async function cleanup(): Promise<void> {
  await client!.query('DELETE FROM pd_fulfillment WHERE order_id = $1', [ORDER]);
  await client!.query('DELETE FROM pd_order WHERE id = $1', [ORDER]);
  await client!.query('DELETE FROM pd_store WHERE id IN ($1, $2)', [STORE_A, STORE_B]);
  await client!.query('DELETE FROM pd_user WHERE id = $1', [USER]);
}

/** Force both parcels into the given states, reset the order, then recompute. */
async function resolve(
  a: string,
  b: string,
  opts: { gateway?: string; paymentStatus?: string; orderStatus?: string } = {},
): Promise<string> {
  await client!.query('UPDATE pd_fulfillment SET status = $2 WHERE id = $1', [FUL_A, a]);
  await client!.query('UPDATE pd_fulfillment SET status = $2 WHERE id = $1', [FUL_B, b]);
  await client!.query(
    `UPDATE pd_order SET status = $2, payment_gateway = $3, payment_status = $4 WHERE id = $1`,
    [ORDER, opts.orderStatus ?? 'pending', opts.gateway ?? 'flouci', opts.paymentStatus ?? 'captured'],
  );
  await syncOrderStatusFromFulfillments(client as never, ORDER);
  const { rows } = await client!.query<{ status: string }>('SELECT status FROM pd_order WHERE id = $1', [ORDER]);
  return rows[0].status;
}

describe('Multi-vendor order aggregate — real SQL truth table', () => {
  it('keeps a fully-awaiting order pending', async () => {
    requireDb();
    expect(await resolve('pending', 'pending')).toBe('pending');
  });

  it('reports processing while any vendor prepares and none shipped', async () => {
    requireDb();
    expect(await resolve('preparing', 'pending')).toBe('processing');
    expect(await resolve('preparing', 'preparing')).toBe('processing');
  });

  it('reports partially_shipped when one vendor shipped and the other has not', async () => {
    requireDb();
    // This is the exact scenario that used to stay frozen at 'pending'.
    expect(await resolve('shipped', 'pending')).toBe('partially_shipped');
    expect(await resolve('shipped', 'preparing')).toBe('partially_shipped');
  });

  it('reports fulfilled only when every active parcel shipped', async () => {
    requireDb();
    expect(await resolve('shipped', 'shipped')).toBe('fulfilled');
    // A cancelled sibling must not block completion
    expect(await resolve('shipped', 'cancelled')).toBe('fulfilled');
  });

  it('reports partially_delivered instead of jumping to delivered', async () => {
    requireDb();
    // Previously: delivered + shipped incorrectly resolved to 'delivered'
    expect(await resolve('delivered', 'shipped')).toBe('partially_delivered');
    expect(await resolve('delivered', 'pending')).toBe('partially_delivered');
    expect(await resolve('delivered', 'preparing')).toBe('partially_delivered');
  });

  it('reports delivered when every active parcel is delivered', async () => {
    requireDb();
    expect(await resolve('delivered', 'delivered')).toBe('delivered');
    expect(await resolve('delivered', 'cancelled')).toBe('delivered');
  });

  it('cancels the order only when every parcel is cancelled', async () => {
    requireDb();
    expect(await resolve('cancelled', 'cancelled')).toBe('cancelled');
  });

  it('preserves payment_required for uncaptured COD orders that are fully awaiting', async () => {
    requireDb();
    expect(await resolve('pending', 'pending', {
      gateway: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'payment_required',
    })).toBe('payment_required');
  });

  it('still progresses an uncaptured COD order once a vendor ships', async () => {
    requireDb();
    expect(await resolve('shipped', 'pending', {
      gateway: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'payment_required',
    })).toBe('partially_shipped');
  });

  it('never resurrects a refunded order', async () => {
    requireDb();
    expect(await resolve('shipped', 'shipped', { orderStatus: 'refunded' })).toBe('refunded');
  });
});
