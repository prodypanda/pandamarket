import bcrypt from 'bcryptjs';
import { UserRole } from '@pandamarket/types';
import { config } from '../config';
import { query } from '../db/pool';
import { PdAuthenticationError, PdConflictError, PdErrorCode, PdNotFoundError, PdValidationError } from '../errors';
import { pdId } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { emailQueue } from '../queues/email-queue';

export interface StorefrontCustomerRow {
  id: string;
  store_id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicStorefrontCustomer {
  id: string;
  store_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: Date;
}

function toPublicCustomer(customer: StorefrontCustomerRow): PublicStorefrontCustomer {
  return {
    id: customer.id,
    store_id: customer.store_id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    email_verified: customer.email_verified,
    is_active: customer.is_active,
    created_at: customer.created_at,
  };
}

export class StorefrontAuthService {
  async register(opts: {
    store_id: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<PublicStorefrontCustomer> {
    const storeId = opts.store_id.trim();
    const email = opts.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new PdValidationError('Invalid email format', { field: 'email' });
    }
    if (opts.password.length < 8) {
      throw new PdValidationError('Password must be at least 8 characters', { field: 'password', min_length: 8 });
    }

    const { rows: storeRows } = await query<{ id: string }>('SELECT id FROM pd_store WHERE id = $1', [storeId]);
    if (!storeRows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found', { store_id: storeId });
    }

    const existing = await query('SELECT id FROM pd_storefront_customer WHERE store_id = $1 AND email = $2', [storeId, email]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new PdConflictError(PdErrorCode.AUTH_EMAIL_EXISTS, 'An account already exists with this email for this storefront', { store_id: storeId, email });
    }

    const id = pdId('sfcust');
    const passwordHash = await bcrypt.hash(opts.password, config.bcryptRounds);
    const { rows } = await query<StorefrontCustomerRow>(
      `INSERT INTO pd_storefront_customer
        (id, store_id, email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, storeId, email, passwordHash, opts.first_name, opts.last_name, opts.phone ?? null],
    );

    logger.info({ storefront_customer_id: id, store_id: storeId }, 'Storefront customer registered');
    emailQueue.add('welcome_customer', {
      to: email,
      template: 'welcome_customer',
      variables: {
        name: opts.first_name,
        store_url: `https://pandamarket.tn/store/${storeId}`,
      },
      scope: 'store',
      store_id: storeId,
    }).catch((err) => logger.warn({ err, store_id: storeId }, 'Storefront welcome email enqueue failed'));
    return toPublicCustomer(rows[0]);
  }

  async login(storeId: string, email: string, password: string): Promise<PublicStorefrontCustomer> {
    const normalizedStoreId = storeId.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await query<StorefrontCustomerRow>(
      `SELECT * FROM pd_storefront_customer
       WHERE store_id = $1 AND email = $2`,
      [normalizedStoreId, normalizedEmail],
    );
    const customer = rows[0];
    if (!customer) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }
    if (!customer.is_active) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Your account has been suspended');
    }
    const ok = await bcrypt.compare(password, customer.password_hash);
    if (!ok) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }

    await query('UPDATE pd_storefront_customer SET last_login_at = NOW() WHERE id = $1', [customer.id]);
    return toPublicCustomer(customer);
  }

  async getById(id: string, storeId: string): Promise<PublicStorefrontCustomer> {
    const { rows } = await query<StorefrontCustomerRow>(
      'SELECT * FROM pd_storefront_customer WHERE id = $1 AND store_id = $2',
      [id, storeId],
    );
    const customer = rows[0];
    if (!customer || !customer.is_active) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
    }
    return toPublicCustomer(customer);
  }

  issueAccessToken(customer: PublicStorefrontCustomer): string {
    return signAccessToken({
      sub: customer.id,
      role: UserRole.Customer,
      store_id: customer.store_id,
    });
  }
}

export const storefrontAuthService = new StorefrontAuthService();
