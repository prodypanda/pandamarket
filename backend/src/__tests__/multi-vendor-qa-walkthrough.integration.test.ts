/**
 * QA-01 → QA-06 walkthrough (audit "Gestion des Commandes Multi-Vendeurs",
 * Phase 4) executed unattended against a real PostgreSQL.
 *
 * Drives a genuine 2-store marketplace order through the full vendor sequence
 * via the service layer, asserting at every step BOTH:
 *   - the master order aggregate (pd_order.status), and
 *   - the buyer payload the API actually returns (fulfillments: per-parcel
 *     status, carrier, tracking number, dates, and per-parcel items).
 *
 * It also proves the channel separation the platform relies on:
 *   - a marketplace order (customer_id) is returned by listByCustomer and
 *     NEVER by listByStorefrontCustomer;
 *   - a storefront order (storefront_customer_id) is returned by
 *     listByStorefrontCustomer and NEVER by listByCustomer;
 *   - a storefront buyer only ever sees their own store's parcel.
 *
 * Skips itself (loudly) when the dev database is unreachable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { orderService } from '../services/order.service';

const DB_URL =
  process.env.PD_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://pd_user:pd_password@localhost:5432/pandamarket';

let client: Client | null = null;
let dbAvailable = false;

// Marketplace (Hub) actors
const BUYER = 'user_qa_buyer';
const OWNER_A = 'user_qa_owner_a';
const OWNER_B = 'user_qa_owner_b';
const STORE_A = 'store_qa_a';
const STORE_B = 'store_qa_b';
const MK_ORDER = 'ord_qa_marketplace';
const FUL_A = 'ful_qa_a';
const FUL_B = 'ful_qa_b';

// Storefront actors (separate channel)
const SF_CUSTOMER = 'sfc_qa_customer';
const SF_ORDER = 'ord_qa_storefront';
const SF_FUL = 'ful_qa_sf';

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
    console.error('[multi-vendor-qa-walkthrough] db unavailable or seed failed:', err);
  }
});

afterAll(async () => {
  if (dbAvailable) await cleanup();
  await client?.end().catch(() => {});
});

async function seed(): Promise<void> {
  // Users first (pd_user.store_id <-> pd_store.owner_id is a FK cycle)
  await client!.query(
    `INSERT INTO pd_user (id, email, password_hash, role, first_name, last_name)
     VALUES ($1, 'qa-buyer@pandamarket.test', 'x', 'customer', 'QA', 'Buyer'),
            ($2, 'qa-owner-a@pandamarket.test', 'x', 'vendor', 'QA', 'OwnerA'),
            ($3, 'qa-owner-b@pandamarket.test', 'x', 'vendor', 'QA', 'OwnerB')`,
    [BUYER, OWNER_A, OWNER_B],
  );
  await client!.query(
    `INSERT INTO pd_store (id, owner_id, name, subdomain, status, is_verified)
     VALUES ($1, $3, 'QA Boutique A', 'qa-boutique-a', 'verified', true),
            ($2, $4, 'QA Boutique B', 'qa-boutique-b', 'verified', true)`,
    [STORE_A, STORE_B, OWNER_A, OWNER_B],
  );
  await client!.query(`UPDATE pd_user SET store_id = $2 WHERE id = $1`, [OWNER_A, STORE_A]);
  await client!.query(`UPDATE pd_user SET store_id = $2 WHERE id = $1`, [OWNER_B, STORE_B]);

  await client!.query(
    `INSERT INTO pd_product (id, store_id, title, slug, price, status, type, thumbnail)
     VALUES ('prod_qa_a', $1, 'Vase Artisanal QA', 'vase-artisanal-qa', 60, 'published', 'physical', 'https://cdn.test/a.webp'),
            ('prod_qa_b', $2, 'Lampe Ceramique QA', 'lampe-ceramique-qa', 40, 'published', 'physical', 'https://cdn.test/b.webp')`,
    [STORE_A, STORE_B],
  );

  // --- Marketplace order: 2 stores, 2 parcels (QA-01) ---
  await client!.query(
    `INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status,
                           subtotal, shipping_total, total, currency, shipping_address)
     VALUES ($1, $2, 'pending', 'flouci', 'captured', 100, 7, 107, 'TND',
             '{"first_name":"QA","last_name":"Buyer","city":"Tunis"}'::jsonb)`,
    [MK_ORDER, BUYER],
  );
  await client!.query(
    `INSERT INTO pd_order_item (id, order_id, product_id, store_id, title, quantity, unit_price, subtotal)
     VALUES ('oitem_qa_a', $1, 'prod_qa_a', $2, 'Vase Artisanal QA', 1, 60, 60),
            ('oitem_qa_b', $1, 'prod_qa_b', $3, 'Lampe Ceramique QA', 1, 40, 40)`,
    [MK_ORDER, STORE_A, STORE_B],
  );
  await client!.query(
    `INSERT INTO pd_fulfillment (id, order_id, store_id, status, shipping_total)
     VALUES ($1, $3, $4, 'pending', 3.5), ($2, $3, $5, 'pending', 3.5)`,
    [FUL_A, FUL_B, MK_ORDER, STORE_A, STORE_B],
  );

  // --- Storefront order: separate channel, single store (store A) ---
  await client!.query(
    `INSERT INTO pd_storefront_customer (id, store_id, email, password_hash, first_name, last_name)
     VALUES ($1, $2, 'qa-sf@pandamarket.test', 'x', 'QA', 'Storefront')`,
    [SF_CUSTOMER, STORE_A],
  );
  await client!.query(
    `INSERT INTO pd_order (id, storefront_customer_id, status, payment_gateway, payment_status,
                           subtotal, shipping_total, total, currency, shipping_address)
     VALUES ($1, $2, 'pending', 'cod', 'pending', 60, 7, 67, 'TND',
             '{"first_name":"QA","last_name":"Storefront","city":"Sousse"}'::jsonb)`,
    [SF_ORDER, SF_CUSTOMER],
  );
  await client!.query(
    `INSERT INTO pd_order_item (id, order_id, product_id, store_id, title, quantity, unit_price, subtotal)
     VALUES ('oitem_qa_sf', $1, 'prod_qa_a', $2, 'Vase Artisanal QA', 1, 60, 60)`,
    [SF_ORDER, STORE_A],
  );
  await client!.query(
    `INSERT INTO pd_fulfillment (id, order_id, store_id, status, shipping_total)
     VALUES ($1, $2, $3, 'pending', 7)`,
    [SF_FUL, SF_ORDER, STORE_A],
  );
}

async function cleanup(): Promise<void> {
  await client!.query(`DELETE FROM pd_fulfillment WHERE order_id IN ($1, $2)`, [MK_ORDER, SF_ORDER]);
  await client!.query(`DELETE FROM pd_order_item WHERE order_id IN ($1, $2)`, [MK_ORDER, SF_ORDER]);
  await client!.query(`DELETE FROM pd_order WHERE id IN ($1, $2)`, [MK_ORDER, SF_ORDER]);
  await client!.query(`DELETE FROM pd_storefront_customer WHERE id = $1`, [SF_CUSTOMER]);
  await client!.query(`DELETE FROM pd_product WHERE id LIKE 'prod_qa_%'`);
  await client!.query(`UPDATE pd_user SET store_id = NULL WHERE id IN ($1, $2)`, [OWNER_A, OWNER_B]);
  await client!.query(`DELETE FROM pd_store WHERE id IN ($1, $2)`, [STORE_A, STORE_B]);
  await client!.query(`DELETE FROM pd_user WHERE id IN ($1, $2, $3)`, [BUYER, OWNER_A, OWNER_B]);
}

interface BuyerParcel {
  id: string;
  store_id: string;
  store_name: string | null;
  status: string;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  items: Array<{ product_title: string; quantity: number }>;
}

/** The buyer payload for the marketplace order, as GET /orders/me returns it. */
async function buyerView(): Promise<{ status: string; parcels: BuyerParcel[] }> {
  const result = await orderService.listByCustomer(BUYER, { page: 1, limit: 10 });
  const order = result.data.find((row) => row.id === MK_ORDER) as unknown as {
    status: string;
    fulfillments: BuyerParcel[];
  };
  expect(order, 'marketplace order missing from listByCustomer').toBeDefined();
  const parcels = [...(order.fulfillments || [])].sort((a, b) => a.store_id.localeCompare(b.store_id));
  return { status: order.status, parcels };
}

describe('QA-01 → QA-06: multi-vendor order walkthrough (real SQL)', () => {
  it('QA-01: a 2-store order starts pending with two awaiting parcels, each carrying its own items', async () => {
    requireDb();
    const view = await buyerView();

    expect(view.status).toBe('pending');
    expect(view.parcels).toHaveLength(2);

    const [parcelA, parcelB] = view.parcels;
    expect(parcelA.store_id).toBe(STORE_A);
    expect(parcelA.store_name).toBe('QA Boutique A');
    expect(parcelA.status).toBe('pending');
    expect(parcelA.carrier).toBeNull();
    expect(parcelA.tracking_number).toBeNull();
    expect(parcelA.items.map((i) => i.product_title)).toEqual(['Vase Artisanal QA']);

    expect(parcelB.store_id).toBe(STORE_B);
    expect(parcelB.items.map((i) => i.product_title)).toEqual(['Lampe Ceramique QA']);
  });

  it('QA-02: store A starts preparing → order becomes processing, only parcel A changes', async () => {
    requireDb();
    await orderService.markStoreFulfillmentPreparing({ order_id: MK_ORDER, store_id: STORE_A });

    const view = await buyerView();
    expect(view.status).toBe('processing');
    expect(view.parcels[0].status).toBe('preparing');
    expect(view.parcels[1].status).toBe('pending');
  });

  it('QA-03: store A ships with an Aramex tracking number → partially_shipped, carrier + tracking visible to the buyer', async () => {
    requireDb();
    await orderService.fulfill({
      order_id: MK_ORDER,
      store_id: STORE_A,
      carrier: 'Aramex',
      tracking_number: 'ARAMEX-QA-12345',
    });

    const view = await buyerView();
    // The exact regression this audit targeted: the order used to stay 'pending'.
    expect(view.status).toBe('partially_shipped');

    const parcelA = view.parcels[0];
    expect(parcelA.status).toBe('shipped');
    expect(parcelA.carrier).toBe('Aramex');
    expect(parcelA.tracking_number).toBe('ARAMEX-QA-12345');
    expect(parcelA.shipped_at).not.toBeNull();

    // Store B is untouched and exposes nothing about store A
    expect(view.parcels[1].status).toBe('pending');
    expect(view.parcels[1].carrier).toBeNull();
    expect(view.parcels[1].tracking_number).toBeNull();
  });

  it('QA-04: store B ships too → the whole order becomes fulfilled', async () => {
    requireDb();
    await orderService.fulfill({
      order_id: MK_ORDER,
      store_id: STORE_B,
      carrier: 'La Poste Tunisienne',
      tracking_number: 'POSTE-QA-99887',
    });

    const view = await buyerView();
    expect(view.status).toBe('fulfilled');
    expect(view.parcels.map((p) => p.status)).toEqual(['shipped', 'shipped']);
    expect(view.parcels[1].carrier).toBe('La Poste Tunisienne');
  });

  it('QA-05: store A is delivered → partially_delivered (NOT delivered)', async () => {
    requireDb();
    await orderService.markStoreFulfillmentDelivered({
      order_id: MK_ORDER,
      store_id: STORE_A,
      delivered_by: OWNER_A,
      received_by: 'QA Buyer',
    });

    const view = await buyerView();
    // Pre-fix this incorrectly resolved to 'delivered' while parcel B was still in transit.
    expect(view.status).toBe('partially_delivered');
    expect(view.parcels[0].status).toBe('delivered');
    expect(view.parcels[0].delivered_at).not.toBeNull();
    expect(view.parcels[1].status).toBe('shipped');
    expect(view.parcels[1].delivered_at).toBeNull();
  });

  it('QA-06: store B is delivered → the order is delivered', async () => {
    requireDb();
    await orderService.markStoreFulfillmentDelivered({
      order_id: MK_ORDER,
      store_id: STORE_B,
      delivered_by: OWNER_B,
      received_by: 'QA Buyer',
    });

    const view = await buyerView();
    expect(view.status).toBe('delivered');
    expect(view.parcels.map((p) => p.status)).toEqual(['delivered', 'delivered']);
  });
});

describe('Channel separation: marketplace vs storefront orders', () => {
  it('the marketplace list returns only Hub orders (never storefront ones)', async () => {
    requireDb();
    const result = await orderService.listByCustomer(BUYER, { page: 1, limit: 50 });
    const ids = result.data.map((row) => row.id);
    expect(ids).toContain(MK_ORDER);
    expect(ids).not.toContain(SF_ORDER);
  });

  it('the storefront list returns only that storefront\'s orders (never Hub ones)', async () => {
    requireDb();
    const result = await orderService.listByStorefrontCustomer(SF_CUSTOMER, STORE_A, { page: 1, limit: 50 });
    const ids = result.data.map((row) => row.id);
    expect(ids).toContain(SF_ORDER);
    expect(ids).not.toContain(MK_ORDER);
  });

  it('a storefront buyer sees exactly one parcel — their own store\'s', async () => {
    requireDb();
    const result = await orderService.listByStorefrontCustomer(SF_CUSTOMER, STORE_A, { page: 1, limit: 50 });
    const order = result.data.find((row) => row.id === SF_ORDER) as unknown as {
      status: string;
      fulfillments: BuyerParcel[];
    };
    expect(order).toBeDefined();
    expect(order.fulfillments).toHaveLength(1);
    expect(order.fulfillments[0].store_id).toBe(STORE_A);
    expect(order.fulfillments[0].items.map((i) => i.product_title)).toEqual(['Vase Artisanal QA']);
  });

  it('an uncaptured COD storefront order stays payment_required while awaiting, then progresses on ship', async () => {
    requireDb();
    await orderService.syncOrderStatusFromFulfillments(client as never, SF_ORDER);
    let { rows } = await client!.query<{ status: string }>('SELECT status FROM pd_order WHERE id = $1', [SF_ORDER]);
    expect(rows[0].status).toBe('payment_required');

    await orderService.fulfill({
      order_id: SF_ORDER,
      store_id: STORE_A,
      carrier: 'Aramex',
      tracking_number: 'ARAMEX-QA-SF-1',
    });
    ({ rows } = await client!.query<{ status: string }>('SELECT status FROM pd_order WHERE id = $1', [SF_ORDER]));
    // Single-store order: every active parcel shipped -> fulfilled (not partial)
    expect(rows[0].status).toBe('fulfilled');
  });

  it('getBuyerOrderDetail scopes parcels for a storefront buyer and returns all parcels for a Hub buyer', async () => {
    requireDb();
    const hubDetail = await orderService.getBuyerOrderDetail(MK_ORDER);
    expect((hubDetail.fulfillments as BuyerParcel[])).toHaveLength(2);

    const scoped = await orderService.getBuyerOrderDetail(MK_ORDER, { storeId: STORE_A });
    const scopedParcels = scoped.fulfillments as BuyerParcel[];
    expect(scopedParcels).toHaveLength(1);
    expect(scopedParcels[0].store_id).toBe(STORE_A);
  });
});
