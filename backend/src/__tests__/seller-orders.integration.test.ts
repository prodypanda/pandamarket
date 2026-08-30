/**
 * Real-SQL integration test for the seller orders read path (audit 5.2).
 *
 * Unlike seller-orders.test.ts (service mocks), this executes the actual
 * listByStore and getStoreOrderDetail SQL against a live PostgreSQL
 * (docker-compose dev database, like migrations.run.test.ts uses) and asserts
 * the real contract:
 *   - listByStore rows NEVER contain an `items` field;
 *   - getStoreOrderDetail rows ALWAYS contain items (or fail 404-style);
 *   - the items belong to the requesting store only (tenant isolation).
 *
 * Skipped automatically when the dev database is unreachable so CI without
 * Docker still passes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { orderService } from '../services/order.service';

const DB_URL =
  process.env.PD_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://pd_user:pd_password@localhost:5432/pandamarket';

let client: Client | null = null;
let connected = false;
let dbAvailable = false;

// Probe the database synchronously enough for skipIf: vitest evaluates
// skipIf before beforeAll, so we mark availability lazily and skip the
// assertions when the probe failed.
beforeAll(async () => {
  client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    await client.query('SELECT 1');
    dbAvailable = true;
    await seed();
    connected = true;
  } catch (err) {
    connected = false;
    // Surface seed/DB errors loudly: a silently-skipped integration test is
    // worse than a red one.
    console.error('[seller-orders.integration] database unavailable or seed failed:', err);
  }
});

afterAll(async () => {
  if (connected) await cleanup();
  await client?.end().catch(() => {});
});

async function seed(): Promise<void> {
  await cleanup();
  // user.store_id <-> store.owner_id form a FK cycle: insert users without a
  // store first, then the stores, then attach the store ids.
  await client!.query(
    `INSERT INTO pd_user (id, email, password_hash, role, first_name, last_name)
     VALUES ($1, 'itest-a@pandamarket.test', 'x', 'vendor', 'A', 'A'),
            ($2, 'itest-b@pandamarket.test', 'x', 'vendor', 'B', 'B')`,
    [USER_A, USER_B],
  );
  await client!.query(
    `INSERT INTO pd_store (id, owner_id, name, subdomain, status, is_verified)
     VALUES ($1, $2, 'ITest A', 'itest-a', 'verified', true),
            ($3, $4, 'ITest B', 'itest-b', 'verified', true)`,
    [STORE_A, USER_A, STORE_B, USER_B],
  );
  await client!.query(`UPDATE pd_user SET store_id = $2 WHERE id = $1`, [USER_A, STORE_A]);
  await client!.query(`UPDATE pd_user SET store_id = $2 WHERE id = $1`, [USER_B, STORE_B]);
  // One order with items from both stores
  await client!.query(
    `INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status, subtotal, shipping_total, total, currency)
     VALUES ('ord_itest_1', $1, 'pending', 'cod', 'pending', 100, 7, 107, 'TND')`,
    [USER_A],
  );
  await client!.query(
    `INSERT INTO pd_product (id, store_id, title, slug, price, status, type)
     VALUES ('prod_itest_a', $1, 'ITest Product A', 'itest-product-a', 60, 'published', 'physical'),
            ('prod_itest_b', $2, 'ITest Product B', 'itest-product-b', 40, 'published', 'physical')`,
    [STORE_A, STORE_B],
  );
  await client!.query(
    `INSERT INTO pd_order_item (id, order_id, product_id, store_id, title, quantity, unit_price, subtotal)
     VALUES ('oitem_itest_a', 'ord_itest_1', 'prod_itest_a', $1, 'ITest Product A', 1, 60, 60),
            ('oitem_itest_b', 'ord_itest_1', 'prod_itest_b', $2, 'ITest Product B', 1, 40, 40)`,
    [STORE_A, STORE_B],
  );
  for (const sid of [STORE_A, STORE_B]) {
    await client!.query(
      `INSERT INTO pd_fulfillment (id, order_id, store_id, shipping_total)
       VALUES ($1, 'ord_itest_1', $2, 3.5)`,
      [`ful_itest_${sid.slice(-1)}`, sid],
    );
  }
}

async function cleanup(): Promise<void> {
  await client!.query(`DELETE FROM pd_fulfillment WHERE order_id = 'ord_itest_1'`);
  await client!.query(`DELETE FROM pd_order_item WHERE order_id = 'ord_itest_1'`);
  await client!.query(`DELETE FROM pd_order WHERE id = 'ord_itest_1'`);
  await client!.query(`DELETE FROM pd_product WHERE id LIKE 'prod_itest_%'`);
  await client!.query(`DELETE FROM pd_store WHERE id IN ($1, $2)`, [STORE_A, STORE_B]);
  await client!.query(`DELETE FROM pd_user WHERE id IN ($1, $2)`, [USER_A, USER_B]);
}

const STORE_A = 'store_itest_a';
const STORE_B = 'store_itest_b';
const USER_A = 'user_itest_a';
const USER_B = 'user_itest_b';

function requireDb(): void {
  if (!dbAvailable) throw new Error('dev database unavailable');
}

describe('Seller orders read path — real SQL contract (audit 5.2)', () => {
  it('listByStore never returns items — the drawer must fetch the detail endpoint', async () => {
    requireDb();
    const result = await orderService.listByStore(STORE_A, { page: 1, limit: 10 });
    expect(result.data.length).toBeGreaterThan(0);
    for (const row of result.data) {
      expect((row as Record<string, unknown>).items).toBeUndefined();
    }
    // Store-scoped totals only include this store's items
    const row = result.data[0] as { store_subtotal?: string };
    expect(parseFloat(String(row.store_subtotal))).toBe(60);
  });

  it('getStoreOrderDetail returns only the requesting store’s items', async () => {
    requireDb();
    const detail = await orderService.getStoreOrderDetail('ord_itest_1', STORE_A);
    expect(detail.items).toHaveLength(1);
    const item = detail.items[0] as { product_title?: string };
    expect(item.product_title).toBe('ITest Product A');

    const detailB = await orderService.getStoreOrderDetail('ord_itest_1', STORE_B);
    const itemB = detailB.items[0] as { product_title?: string };
    expect(itemB.product_title).toBe('ITest Product B');
  });

  it('getStoreOrderDetail throws for a store with no items on the order', async () => {
    requireDb();
    // A third store with no rows on the order must not see anything
    await expect(orderService.getStoreOrderDetail('ord_itest_1', 'store_missing')).rejects.toThrow();
  });
});
