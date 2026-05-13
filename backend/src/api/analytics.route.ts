import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { asyncHandler, validate, requireStore } from '../middlewares';

const router = Router();

// ==========================================================
// Schemas
// ==========================================================

const analyticsQuerySchema = z.object({
  period: z.coerce.number().int().refine((v) => [7, 30, 90].includes(v), {
    message: 'Period must be 7, 30, or 90',
  }).default(30),
});

// ==========================================================
// GET /store — Vendor store analytics
// ==========================================================

router.get(
  '/store',
  requireStore,
  validate(analyticsQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const period = Number(req.query.period) || 30;

    // 1. Revenue trend — daily totals for the period
    const { rows: revenueTrend } = await query<{
      date: string;
      revenue: string;
      orders: string;
    }>(
      `SELECT
         d.date::text AS date,
         COALESCE(SUM(oi.subtotal), 0)::text AS revenue,
         COUNT(DISTINCT o.id)::text AS orders
       FROM generate_series(
         CURRENT_DATE - ($2::int - 1) * INTERVAL '1 day',
         CURRENT_DATE,
         '1 day'
       ) AS d(date)
       LEFT JOIN pd_order_item oi
         ON oi.store_id = $1
         AND oi.created_at::date = d.date
       LEFT JOIN pd_order o
         ON o.id = oi.order_id
         AND o.status NOT IN ('cancelled', 'refunded')
         AND o.payment_status = 'captured'
       GROUP BY d.date
       ORDER BY d.date ASC`,
      [storeId, period],
    );

    // 2. Order status breakdown
    const { rows: orderBreakdown } = await query<{
      status: string;
      count: string;
    }>(
      `SELECT o.status, COUNT(*)::text AS count
       FROM pd_order o
       WHERE EXISTS (
         SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $1
       )
       AND o.created_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
       GROUP BY o.status
       ORDER BY count DESC`,
      [storeId, period],
    );

    // 3. Top 10 products by revenue
    const { rows: topProducts } = await query<{
      id: string;
      title: string;
      image_url: string | null;
      revenue: string;
      units_sold: string;
    }>(
      `SELECT
         p.id,
         p.title,
         p.thumbnail AS image_url,
         COALESCE(SUM(oi.subtotal), 0)::text AS revenue,
         COALESCE(SUM(oi.quantity), 0)::text AS units_sold
       FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
         AND o.status NOT IN ('cancelled', 'refunded')
         AND o.payment_status = 'captured'
       JOIN pd_product p ON p.id = oi.product_id
       WHERE oi.store_id = $1
         AND oi.created_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
       GROUP BY p.id, p.title, p.thumbnail
       ORDER BY SUM(oi.subtotal) DESC
       LIMIT 10`,
      [storeId, period],
    );

    // 4. Revenue by day of week
    const { rows: revenueByDay } = await query<{
      day: string;
      label: string;
      revenue: string;
      orders: string;
    }>(
      `SELECT
         EXTRACT(DOW FROM oi.created_at)::text AS day,
         TO_CHAR(oi.created_at, 'Dy') AS label,
         COALESCE(SUM(oi.subtotal), 0)::text AS revenue,
         COUNT(DISTINCT o.id)::text AS orders
       FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
         AND o.status NOT IN ('cancelled', 'refunded')
         AND o.payment_status = 'captured'
       WHERE oi.store_id = $1
         AND oi.created_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
       GROUP BY EXTRACT(DOW FROM oi.created_at), TO_CHAR(oi.created_at, 'Dy')
       ORDER BY EXTRACT(DOW FROM oi.created_at)`,
      [storeId, period],
    );

    // 5. KPIs — current period
    const { rows: currentKpis } = await query<{
      total_revenue: string;
      total_orders: string;
      avg_order_value: string;
      unique_customers: string;
      repeat_customers: string;
    }>(
      `SELECT
         COALESCE(SUM(oi.subtotal), 0)::text AS total_revenue,
         COUNT(DISTINCT o.id)::text AS total_orders,
         CASE WHEN COUNT(DISTINCT o.id) > 0
           THEN (SUM(oi.subtotal) / COUNT(DISTINCT o.id))::text
           ELSE '0'
         END AS avg_order_value,
         COUNT(DISTINCT COALESCE(o.customer_id, o.storefront_customer_id))::text AS unique_customers,
         (
           SELECT COUNT(*)::text
           FROM (
             SELECT COALESCE(o2.customer_id, o2.storefront_customer_id) AS cid
             FROM pd_order o2
             WHERE EXISTS (SELECT 1 FROM pd_order_item oi2 WHERE oi2.order_id = o2.id AND oi2.store_id = $1)
               AND o2.status NOT IN ('cancelled', 'refunded')
               AND o2.payment_status = 'captured'
               AND o2.created_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
             GROUP BY COALESCE(o2.customer_id, o2.storefront_customer_id)
             HAVING COUNT(*) >= 2
           ) repeat_q
         ) AS repeat_customers
       FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
         AND o.status NOT IN ('cancelled', 'refunded')
         AND o.payment_status = 'captured'
       WHERE oi.store_id = $1
         AND oi.created_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'`,
      [storeId, period],
    );

    // 6. KPIs — previous period (for growth calculation)
    const { rows: prevKpis } = await query<{
      total_revenue: string;
      total_orders: string;
    }>(
      `SELECT
         COALESCE(SUM(oi.subtotal), 0)::text AS total_revenue,
         COUNT(DISTINCT o.id)::text AS total_orders
       FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
         AND o.status NOT IN ('cancelled', 'refunded')
         AND o.payment_status = 'captured'
       WHERE oi.store_id = $1
         AND oi.created_at >= CURRENT_DATE - ($2::int * 2) * INTERVAL '1 day'
         AND oi.created_at < CURRENT_DATE - ($2::int) * INTERVAL '1 day'`,
      [storeId, period],
    );

    const curRev = parseFloat(currentKpis[0]?.total_revenue || '0');
    const prevRev = parseFloat(prevKpis[0]?.total_revenue || '0');
    const uniqueCustomers = parseInt(currentKpis[0]?.unique_customers || '0', 10);
    const repeatCustomers = parseInt(currentKpis[0]?.repeat_customers || '0', 10);

    res.status(200).json({
      revenue_trend: revenueTrend.map((r) => ({
        date: r.date.slice(0, 10),
        revenue: parseFloat(r.revenue),
        orders: parseInt(r.orders, 10),
      })),
      order_breakdown: orderBreakdown.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      top_products: topProducts.map((r) => ({
        id: r.id,
        title: r.title,
        image_url: r.image_url,
        revenue: parseFloat(r.revenue),
        units_sold: parseInt(r.units_sold, 10),
      })),
      revenue_by_day: revenueByDay.map((r) => ({
        day: parseInt(r.day, 10),
        label: r.label,
        revenue: parseFloat(r.revenue),
        orders: parseInt(r.orders, 10),
      })),
      kpis: {
        total_revenue: curRev,
        total_orders: parseInt(currentKpis[0]?.total_orders || '0', 10),
        avg_order_value: parseFloat(currentKpis[0]?.avg_order_value || '0'),
        repeat_customer_rate: uniqueCustomers > 0
          ? Math.round((repeatCustomers / uniqueCustomers) * 100)
          : 0,
        conversion_period_growth: prevRev > 0
          ? Math.round(((curRev - prevRev) / prevRev) * 100)
          : curRev > 0 ? 100 : 0,
      },
    });
  }),
);

export default router;
