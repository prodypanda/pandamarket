import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import { PdErrorCode, PdNotFoundError } from '../errors';
import { pdId } from '../utils/crypto';

export interface AddressRow {
  id: string;
  customer_id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AddressInput {
  label?: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country?: string;
  is_default?: boolean;
}

export class AddressService {
  async list(customerId: string): Promise<AddressRow[]> {
    const { rows } = await query<AddressRow>(
      `SELECT * FROM pd_customer_address
       WHERE customer_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [customerId],
    );
    return rows;
  }

  async create(customerId: string, input: AddressInput): Promise<AddressRow> {
    return transaction(async (client) => {
      const shouldDefault = input.is_default || await this.hasNoAddresses(customerId, client);
      if (shouldDefault) {
        await client.query(
          'UPDATE pd_customer_address SET is_default = false WHERE customer_id = $1',
          [customerId],
        );
      }

      const { rows } = await client.query<AddressRow>(
        `INSERT INTO pd_customer_address
          (id, customer_id, label, first_name, last_name, phone, address_line_1, address_line_2,
           city, state, postal_code, country, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          pdId('addr'),
          customerId,
          input.label?.trim() || 'Adresse',
          input.first_name.trim(),
          input.last_name.trim(),
          input.phone.trim(),
          input.address_line_1.trim(),
          input.address_line_2?.trim() || null,
          input.city.trim(),
          input.state?.trim() || null,
          input.postal_code.trim(),
          input.country ?? 'TN',
          shouldDefault,
        ],
      );
      return rows[0];
    });
  }

  async update(customerId: string, addressId: string, input: Partial<AddressInput>): Promise<AddressRow> {
    return transaction(async (client) => {
      if (input.is_default) {
        await client.query(
          'UPDATE pd_customer_address SET is_default = false WHERE customer_id = $1 AND id != $2',
          [customerId, addressId],
        );
      }

      const { rows } = await client.query<AddressRow>(
        `UPDATE pd_customer_address
         SET label = COALESCE($3, label),
             first_name = COALESCE($4, first_name),
             last_name = COALESCE($5, last_name),
             phone = COALESCE($6, phone),
             address_line_1 = COALESCE($7, address_line_1),
             address_line_2 = COALESCE($8, address_line_2),
             city = COALESCE($9, city),
             state = COALESCE($10, state),
             postal_code = COALESCE($11, postal_code),
             country = COALESCE($12, country),
             is_default = COALESCE($13, is_default)
         WHERE id = $1 AND customer_id = $2
         RETURNING *`,
        [
          addressId,
          customerId,
          input.label?.trim() || null,
          input.first_name?.trim() || null,
          input.last_name?.trim() || null,
          input.phone?.trim() || null,
          input.address_line_1?.trim() || null,
          input.address_line_2?.trim() || null,
          input.city?.trim() || null,
          input.state?.trim() || null,
          input.postal_code?.trim() || null,
          input.country || null,
          input.is_default ?? null,
        ],
      );

      if (!rows[0]) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Address not found');
      }
      return rows[0];
    });
  }

  async setDefault(customerId: string, addressId: string): Promise<AddressRow> {
    return transaction(async (client) => {
      await this.assertExists(customerId, addressId, client);
      await client.query('UPDATE pd_customer_address SET is_default = false WHERE customer_id = $1', [customerId]);
      const { rows } = await client.query<AddressRow>(
        `UPDATE pd_customer_address
         SET is_default = true
         WHERE id = $1 AND customer_id = $2
         RETURNING *`,
        [addressId, customerId],
      );
      return rows[0];
    });
  }

  async delete(customerId: string, addressId: string): Promise<void> {
    await transaction(async (client) => {
      const { rows } = await client.query<{ is_default: boolean }>(
        'DELETE FROM pd_customer_address WHERE id = $1 AND customer_id = $2 RETURNING is_default',
        [addressId, customerId],
      );
      if (!rows[0]) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Address not found');
      }
      if (rows[0].is_default) {
        await client.query(
          `UPDATE pd_customer_address
           SET is_default = true
           WHERE id = (
             SELECT id FROM pd_customer_address
             WHERE customer_id = $1
             ORDER BY created_at DESC
             LIMIT 1
           )`,
          [customerId],
        );
      }
    });
  }

  private async hasNoAddresses(customerId: string, client: PoolClient): Promise<boolean> {
    const { rows } = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_customer_address WHERE customer_id = $1',
      [customerId],
    );
    return rows[0].count === '0';
  }

  private async assertExists(customerId: string, addressId: string, client: PoolClient): Promise<void> {
    const { rows } = await client.query(
      'SELECT 1 FROM pd_customer_address WHERE id = $1 AND customer_id = $2',
      [addressId, customerId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Address not found');
    }
  }
}

export const addressService = new AddressService();
