/**
 * OrderService — checkout, order creation with order-splitting per vendor,
 * fulfillment status updates, cancellation.
 */

import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdErrorCode,
  PdNotFoundError,
  PdValidationError,
} from '../errors';
import {
  IAddress,
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  ProductStatus,
} from '@pandamarket/types';
import { roundTnd } from '../utils/money';
import { logger } from '../utils/logger';
import { config } from '../config';

interface CartLine {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface PreparedItem {
  product_id: string;
  variant_id: string | null;
  store_id: string;
  title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderRow {
  id: string;
  customer_id: string;
  status: OrderStatus;
  payment_gateway: PaymentGateway;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  subtotal: string;
  shipping_total: string;
  total: string;
  currency: string;
  shipping_address: IAddress | null;
  created_at: Date;
  updated_at: Date;
}

const FLAT_SHIPPING_PER_STORE = 7; // TND — placeholder until Aramex integration

export class OrderService {
  /**
   * Create an order from a cart. Splits items per store into separate fulfillments.
   */
  async checkout(opts: {
    customer_id: string;
    items: CartLine[];
    shipping_address: IAddress;
    payment_gateway: PaymentGateway;
  }): Promise<OrderRow> {
    if (!opts.items || opts.items.length === 0) {
      throw new PdValidationError('Cart is empty', { code: PdErrorCode.ORDER_EMPTY_CART });
    }

    return transaction(async (c) => {
      // ----- Resolve products + check stock -----
      const prepared: PreparedItem[] = [];
      for (const line of opts.items) {
        if (line.quantity <= 0) {
          throw new PdValidationError('Quantity must be positive');
        }
        const { rows: prodRows } = await c.query<{
          id: string;
          store_id: string;
          title: string;
          price: string;
          inventory_quantity: number;
          status: ProductStatus;
        }>(
          'SELECT id, store_id, title, price, inventory_quantity, status FROM pd_product WHERE id = $1',
          [line.product_id],
        );
        const product = prodRows[0];
        if (!product) {
          throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found', {
            product_id: line.product_id,
          });
        }
        if (product.status !== ProductStatus.Published) {
          throw new PdValidationError('Product is not available', {
            product_id: line.product_id,
          });
        }
        if (product.inventory_quantity < line.quantity) {
          throw new PdValidationError('Insufficient stock', {
            code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
            product_id: line.product_id,
            available: product.inventory_quantity,
          });
        }

        let unitPrice = parseFloat(product.price);
        let title = product.title;
        if (line.variant_id) {
          const { rows: varRows } = await c.query<{
            id: string;
            title: string;
            price: string;
            inventory_quantity: number;
            product_id: string;
          }>(
            'SELECT id, title, price, inventory_quantity, product_id FROM pd_product_variant WHERE id = $1',
            [line.variant_id],
          );
          const variant = varRows[0];
          if (!variant || variant.product_id !== product.id) {
            throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Variant not found');
          }
          if (variant.inventory_quantity < line.quantity) {
            throw new PdValidationError('Insufficient stock for variant', {
              code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
            });
          }
          unitPrice = parseFloat(variant.price);
          title = `${product.title} — ${variant.title}`;
        }
        prepared.push({
          product_id: product.id,
          variant_id: line.variant_id ?? null,
          store_id: product.store_id,
          title,
          unit_price: unitPrice,
          quantity: line.quantity,
          subtotal: roundTnd(unitPrice * line.quantity),
        });
      }

      // ----- Compute totals (one fulfillment per distinct store) -----
      const storeIds = Array.from(new Set(prepared.map((p) => p.store_id)));
      const subtotal = roundTnd(prepared.reduce((s, it) => s + it.subtotal, 0));
      const shippingTotal = roundTnd(storeIds.length * FLAT_SHIPPING_PER_STORE);
      const total = roundTnd(subtotal + shippingTotal);

      // ----- Create order -----
      const orderId = pdId('order');
      const initialStatus =
        opts.payment_gateway === PaymentGateway.ManualMandat ||
        opts.payment_gateway === PaymentGateway.Cod
          ? OrderStatus.PaymentRequired
          : OrderStatus.Pending;

      const { rows: orderRows } = await c.query<OrderRow>(
        `INSERT INTO pd_order
          (id, customer_id, status, payment_gateway, subtotal, shipping_total,
           total, currency, shipping_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          orderId,
          opts.customer_id,
          initialStatus,
          opts.payment_gateway,
          subtotal,
          shippingTotal,
          total,
          config.defaultCurrency,
          JSON.stringify(opts.shipping_address),
        ],
      );

      // ----- Create order items -----
      for (const item of prepared) {
        await c.query(
          `INSERT INTO pd_order_item
            (id, order_id, product_id, variant_id, store_id, title, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            pdId('oitem'),
            orderId,
            item.product_id,
            item.variant_id,
            item.store_id,
            item.title,
            item.quantity,
            item.unit_price,
            item.subtotal,
          ],
        );
        // Decrement stock
        await c.query(
          `UPDATE pd_product
           SET inventory_quantity = inventory_quantity - $2
           WHERE id = $1`,
          [item.product_id, item.quantity],
        );
        if (item.variant_id) {
          await c.query(
            `UPDATE pd_product_variant
             SET inventory_quantity = inventory_quantity - $2
             WHERE id = $1`,
            [item.variant_id, item.quantity],
          );
        }
      }

      // ----- Create one fulfillment per store -----
      for (const sid of storeIds) {
        await c.query(
          `INSERT INTO pd_fulfillment (id, order_id, store_id, shipping_total)
           VALUES ($1, $2, $3, $4)`,
          [pdId('ful'), orderId, sid, FLAT_SHIPPING_PER_STORE],
        );
      }

      logger.info(
        { order_id: orderId, customer_id: opts.customer_id, total, stores: storeIds.length },
        'Order created',
      );
      return orderRows[0];
    });
  }

  async getById(id: string): Promise<OrderRow> {
    const { rows } = await query<OrderRow>('SELECT * FROM pd_order WHERE id = $1', [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
    return rows[0];
  }

  async listByCustomer(customerId: string, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const { rows } = await query<OrderRow>(
      `SELECT * FROM pd_order WHERE customer_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [customerId, limit, offset],
    );
    const { rows: cnt } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_order WHERE customer_id = $1',
      [customerId],
    );
    const total = parseInt(cnt[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * List orders that contain at least one item from the given store.
   */
  async listByStore(storeId: string, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const { rows } = await query<OrderRow>(
      `SELECT DISTINCT o.* FROM pd_order o
       JOIN pd_order_item i ON i.order_id = o.id
       WHERE i.store_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [storeId, limit, offset],
    );
    const { rows: cnt } = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT o.id)::text AS count FROM pd_order o
       JOIN pd_order_item i ON i.order_id = o.id
       WHERE i.store_id = $1`,
      [storeId],
    );
    const total = parseInt(cnt[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * Mark a fulfillment (this store's portion of an order) as shipped.
   */
  async fulfill(opts: {
    order_id: string;
    store_id: string;
    carrier?: string;
    tracking_number?: string;
  }): Promise<void> {
    const { rowCount } = await query(
      `UPDATE pd_fulfillment
       SET status = 'shipped', carrier = $3, tracking_number = $4, shipped_at = NOW()
       WHERE order_id = $1 AND store_id = $2 AND status = 'pending'`,
      [opts.order_id, opts.store_id, opts.carrier ?? null, opts.tracking_number ?? null],
    );
    if (!rowCount) {
      throw new PdConflictError(
        PdErrorCode.ORDER_ALREADY_FULFILLED,
        'Fulfillment not found or already shipped',
      );
    }
    // If all fulfillments for this order are shipped, mark the order as fulfilled
    const { rows } = await query<{ pending: string }>(
      `SELECT COUNT(*)::text AS pending
       FROM pd_fulfillment WHERE order_id = $1 AND status = 'pending'`,
      [opts.order_id],
    );
    if (rows[0].pending === '0') {
      await query(
        `UPDATE pd_order SET status = 'fulfilled' WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
        [opts.order_id],
      );
    }
    logger.info(opts, 'Fulfillment shipped');
  }

  async cancel(orderId: string, reason: string): Promise<void> {
    const order = await this.getById(orderId);
    if (order.status === OrderStatus.Cancelled) {
      throw new PdConflictError(PdErrorCode.ORDER_ALREADY_CANCELLED, 'Order already cancelled');
    }
    if ([OrderStatus.Fulfilled, OrderStatus.Delivered].includes(order.status)) {
      throw new PdValidationError('Cannot cancel a shipped/delivered order', {
        code: PdErrorCode.ORDER_CANNOT_CANCEL,
        status: order.status,
      });
    }
    await transaction(async (c) => {
      await c.query(
        `UPDATE pd_order SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $2
         WHERE id = $1`,
        [orderId, reason],
      );
      // Restock items
      const { rows: items } = await c.query<{
        product_id: string;
        variant_id: string | null;
        quantity: number;
      }>(`SELECT product_id, variant_id, quantity FROM pd_order_item WHERE order_id = $1`, [
        orderId,
      ]);
      for (const it of items) {
        await c.query(
          `UPDATE pd_product SET inventory_quantity = inventory_quantity + $2 WHERE id = $1`,
          [it.product_id, it.quantity],
        );
        if (it.variant_id) {
          await c.query(
            `UPDATE pd_product_variant SET inventory_quantity = inventory_quantity + $2 WHERE id = $1`,
            [it.variant_id, it.quantity],
          );
        }
      }
    });
    logger.info({ order_id: orderId, reason }, 'Order cancelled');
  }

  /**
   * Mark an order as paid (called after payment capture).
   * Triggers the payment-captured event for downstream wallet credit.
   */
  async markPaid(orderId: string, gateway: PaymentGateway, reference: string): Promise<OrderRow> {
    const { rows } = await query<OrderRow>(
      `UPDATE pd_order
       SET payment_status = 'captured',
           payment_reference = $3,
           status = CASE WHEN status = 'payment_required' THEN 'pending' ELSE status END
       WHERE id = $1 AND payment_status != 'captured'
       RETURNING *`,
      [orderId, gateway, reference],
    );
    if (!rows[0]) {
      throw new PdConflictError(
        PdErrorCode.PAY_ALREADY_CAPTURED,
        'Order not found or already paid',
      );
    }
    return rows[0];
  }
}

export const orderService = new OrderService();
