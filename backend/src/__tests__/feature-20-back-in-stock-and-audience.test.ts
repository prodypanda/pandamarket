import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backInStockService } from '../services/back-in-stock.service';
import { sellerBroadcastService } from '../services/seller-broadcast.service';
import { cartService } from '../services/cart.service';
import * as db from '../db/pool';

describe('Feature 20 R5 — Back-in-Stock Alerts & Seller Audience Segmentation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('BackInStockService', () => {
    it('rejects invalid or missing email', async () => {
      await expect(
        backInStockService.subscribeAlert('prod_123', 'invalid-email')
      ).rejects.toThrow('Valid email address is required');

      await expect(
        backInStockService.subscribeAlert('', 'valid@example.com')
      ).rejects.toThrow('Product ID is required');
    });

    it('subscribes customer and creates pending alert record', async () => {
      vi.spyOn(db, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.text;
        if (sqlStr.includes('FROM pd_product')) {
          return { rows: [{ id: 'prod_123', title: 'Sweat Panda', store_id: 'store_1', inventory_quantity: 0 }] } as any;
        }
        if (sqlStr.includes('INSERT INTO pd_product_back_in_stock_alert')) {
          return { rows: [] } as any;
        }
        return { rows: [] } as any;
      });

      const res = await backInStockService.subscribeAlert('prod_123', 'buyer@panda.tn', 'user_456');
      expect(res.success).toBe(true);
      expect(res.alert_id).toBeDefined();
    });

    it('dispatches notifications and marks alerts notified when stock > 0', async () => {
      vi.spyOn(db, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.text;
        if (sqlStr.includes('FROM pd_product_back_in_stock_alert') && sqlStr.includes('status = \'pending\'')) {
          return {
            rows: [
              { id: 'bisa_1', product_id: 'prod_123', store_id: 'store_1', buyer_id: 'user_456', email: 'buyer@panda.tn' }
            ]
          } as any;
        }
        if (sqlStr.includes('SELECT p.title, p.price, p.thumbnail, s.name as store_name')) {
          return {
            rows: [
              { title: 'Sweat Panda', price: 89.0, thumbnail: 'https://img.tn/sweat.jpg', store_name: 'PandaStyle' }
            ]
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await backInStockService.notifySubscribersOnRestock('prod_123', 15);
      expect(res.notified_count).toBe(1);
    });

    it('returns 0 notifications when new stock is <= 0', async () => {
      const res = await backInStockService.notifySubscribersOnRestock('prod_123', 0);
      expect(res.notified_count).toBe(0);
    });
  });

  describe('SellerBroadcastService Audience & Subscribers', () => {
    it('fetches subscriber audience list with pagination and verified filter', async () => {
      vi.spyOn(db, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.text;
        if (sqlStr.includes('COUNT(DISTINCT s.id)')) {
          return { rows: [{ count: '1' }] } as any;
        }
        if (sqlStr.includes('FROM pd_store_subscription s')) {
          return {
            rows: [
              {
                id: 'sub_1',
                buyer_id: 'user_1',
                first_name: 'Amine',
                last_name: 'Ben Salem',
                email: 'amine@test.tn',
                city: 'Tunis',
                is_verified_buyer: true,
                notify_price_drops: true,
                notify_new_products: true,
                created_at: new Date('2026-08-01T10:00:00Z'),
              }
            ]
          } as any;
        }
        return { rows: [] } as any;
      });

      const list = await sellerBroadcastService.getSubscribersList('store_1', { page: 1, limit: 10, verifiedOnly: true });
      expect(list.total).toBe(1);
      expect(list.subscribers[0].first_name).toBe('Amine');
      expect(list.subscribers[0].is_verified_buyer).toBe(true);
    });

    it('exports subscriber audience to CSV formatted with UTF-8 BOM', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            id: 'sub_1',
            first_name: 'Fatma',
            last_name: 'Trabelsi',
            email: 'fatma@test.tn',
            city: 'Sousse',
            is_verified_buyer: true,
            created_at: new Date('2026-08-10T12:00:00Z'),
          }
        ]
      } as any);

      const csv = await sellerBroadcastService.exportSubscribersCsv('store_1');
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ID,Nom,Prenom,Email,Gouvernorat/Ville,Acheteur Verifie,Date Abonnement');
      expect(csv).toContain('"Trabelsi","Fatma","fatma@test.tn","Sousse",OUI,2026-08-10');
    });
  });

  describe('CartService Broadcast Coupon Evaluation', () => {
    it('applies seller broadcast percentage coupon correctly to vendor products', async () => {
      vi.spyOn(db, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.text;
        if (sqlStr.includes('FROM pd_seller_broadcast')) {
          return {
            rows: [
              {
                store_id: 'str_1',
                discount_type: 'percentage',
                discount_value: 20, // 20%
              }
            ]
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await cartService.syncCart({
        items: [
          {
            product_id: 'prod_1',
            store_id: 'str_1',
            store_name: 'Panda Boutique',
            price: 50.0,
            unit_price: 50.0,
            quantity: 2,
            title: 'T-Shirt Panda',
          }
        ],
        coupon_code: 'VIP20',
      });

      expect(res.subtotal).toBe(100.0);
      expect(res.discount_amount).toBe(20.0); // 20% of 100 TND
    });
  });
});
