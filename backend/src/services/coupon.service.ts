import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { PdValidationError } from '../errors';
import { logger } from '../utils/logger';

export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';

export interface CouponRow {
  id: string;
  store_id: string | null;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: string | number;
  min_order_amount: string | number;
  max_discount_amount: string | number | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: Date;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCouponInput {
  storeId?: string | null;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  startsAt?: Date;
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface ValidateCouponOptions {
  subtotal: number;
  storeIds?: string[];
  shippingTotal?: number;
  userId?: string | null;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponRow;
  discountAmount: number;
  discountType: CouponDiscountType;
  freeShipping: boolean;
  errorMessage?: string;
}

export class CouponService {
  async createCoupon(input: CreateCouponInput): Promise<CouponRow> {
    const code = input.code.trim().toUpperCase();
    if (!code || code.length < 3) {
      throw new PdValidationError('Le code promo doit comporter au moins 3 caractères');
    }

    if (input.discountValue <= 0) {
      throw new PdValidationError('La valeur de la réduction doit être supérieure à 0');
    }

    if (input.discountType === 'percentage' && input.discountValue > 100) {
      throw new PdValidationError('Le pourcentage de réduction ne peut pas dépasser 100%');
    }

    const id = pdId('cpn');
    const res = await query<CouponRow>(
      `INSERT INTO pd_coupon (
        id, store_id, code, discount_type, discount_value, min_order_amount,
        max_discount_amount, usage_limit, starts_at, expires_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        input.storeId || null,
        code,
        input.discountType,
        input.discountValue,
        input.minOrderAmount || 0,
        input.maxDiscountAmount || null,
        input.usageLimit || null,
        input.startsAt || new Date(),
        input.expiresAt || null,
        input.isActive !== false,
      ],
    );

    return res.rows[0];
  }

  async getCouponByCode(rawCode: string): Promise<CouponRow | null> {
    const code = rawCode.trim().toUpperCase();
    if (!code) return null;

    const res = await query<CouponRow>(
      `SELECT * FROM pd_coupon WHERE UPPER(code) = $1 LIMIT 1`,
      [code],
    );
    return res.rows[0] || null;
  }

  async validateCoupon(rawCode: string, opts: ValidateCouponOptions): Promise<CouponValidationResult> {
    const coupon = await this.getCouponByCode(rawCode);
    if (!coupon) {
      return { valid: false, discountAmount: 0, discountType: 'fixed_amount', freeShipping: false, errorMessage: 'Code promo inexistant' };
    }

    if (!coupon.is_active) {
      return { valid: false, discountAmount: 0, discountType: coupon.discount_type, freeShipping: false, errorMessage: 'Ce code promo est désactivé' };
    }

    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return { valid: false, discountAmount: 0, discountType: coupon.discount_type, freeShipping: false, errorMessage: 'Ce code promo n\'est pas encore actif' };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return { valid: false, discountAmount: 0, discountType: coupon.discount_type, freeShipping: false, errorMessage: 'Ce code promo a expiré' };
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { valid: false, discountAmount: 0, discountType: coupon.discount_type, freeShipping: false, errorMessage: 'Limite d\'utilisation du code atteinte' };
    }

    const minAmount = Number(coupon.min_order_amount || 0);
    if (opts.subtotal < minAmount) {
      return {
        valid: false,
        discountAmount: 0,
        discountType: coupon.discount_type,
        freeShipping: false,
        errorMessage: `Montant minimum requis de ${minAmount.toFixed(3)} TND pour utiliser ce code`,
      };
    }

    // Store scope check
    if (coupon.store_id && opts.storeIds && opts.storeIds.length > 0) {
      if (!opts.storeIds.includes(coupon.store_id)) {
        return {
          valid: false,
          discountAmount: 0,
          discountType: coupon.discount_type,
          freeShipping: false,
          errorMessage: 'Ce code promo ne s\'applique pas aux boutiques sélectionnées dans le panier',
        };
      }
    }

    let discountAmount = 0;
    let freeShipping = false;
    const discountVal = Number(coupon.discount_value);

    if (coupon.discount_type === 'percentage') {
      discountAmount = (opts.subtotal * discountVal) / 100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = Math.min(opts.subtotal, discountVal);
    } else if (coupon.discount_type === 'free_shipping') {
      freeShipping = true;
      discountAmount = Number(opts.shippingTotal || 0);
    }

    return {
      valid: true,
      coupon,
      discountAmount: Math.round(discountAmount * 1000) / 1000,
      discountType: coupon.discount_type,
      freeShipping,
    };
  }

  async recordRedemption(couponId: string, orderId: string, userId: string | null, discountApplied: number): Promise<void> {
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO pd_coupon_redemption (id, coupon_id, order_id, user_id, discount_applied, redeemed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [pdId('redem'), couponId, orderId, userId, discountApplied],
      );

      await client.query(
        `UPDATE pd_coupon SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
        [couponId],
      );
    });
    logger.info({ couponId, orderId, discountApplied }, 'Recorded coupon redemption');
  }

  async listCoupons(opts: { storeId?: string | null; page?: number; limit?: number } = {}): Promise<{ data: CouponRow[]; total: number }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    let where = '1=1';

    if (opts.storeId !== undefined) {
      if (opts.storeId === null) {
        where += ' AND store_id IS NULL';
      } else {
        params.push(opts.storeId);
        where += ` AND (store_id = $${params.length} OR store_id IS NULL)`;
      }
    }

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM pd_coupon WHERE ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    params.push(limit, offset);
    const res = await query<CouponRow>(
      `SELECT * FROM pd_coupon WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { data: res.rows, total };
  }

  async deleteCoupon(couponId: string, storeId?: string): Promise<boolean> {
    let sql = 'DELETE FROM pd_coupon WHERE id = $1';
    const params: unknown[] = [couponId];
    if (storeId) {
      params.push(storeId);
      sql += ` AND store_id = $2`;
    }

    const res = await query(sql, params);
    return (res.rowCount || 0) > 0;
  }
}

export const couponService = new CouponService();
