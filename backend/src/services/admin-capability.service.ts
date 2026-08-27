import { query } from '../db/pool';
import { logger } from '../utils/logger';
import { PdValidationError } from '../errors';

export const ADMIN_CAPABILITIES = [
  'catalog:manage',
  'finance:view',
  'finance:payout',
  'support:manage',
  'settings:manage',
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

export class AdminCapabilityService {
  async grantCapability(userId: string, capability: string, grantedBy?: string): Promise<boolean> {
    if (!ADMIN_CAPABILITIES.includes(capability as AdminCapability)) {
      throw new PdValidationError(`Invalid capability '${capability}'. Valid: ${ADMIN_CAPABILITIES.join(', ')}`);
    }

    await query(
      `INSERT INTO pd_admin_capability (user_id, capability, granted_by, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, capability) DO NOTHING`,
      [userId, capability, grantedBy || null],
    );

    logger.info({ userId, capability, grantedBy }, 'Admin capability granted');
    return true;
  }

  async revokeCapability(userId: string, capability: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM pd_admin_capability WHERE user_id = $1 AND capability = $2`,
      [userId, capability],
    );
    logger.info({ userId, capability }, 'Admin capability revoked');
    return (res.rowCount || 0) > 0;
  }

  async getUserCapabilities(userId: string): Promise<string[]> {
    const res = await query<{ capability: string }>(
      `SELECT capability FROM pd_admin_capability WHERE user_id = $1 ORDER BY capability ASC`,
      [userId],
    );
    return res.rows.map((r) => r.capability);
  }

  async hasCapability(userId: string, capability: string): Promise<boolean> {
    const res = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM pd_admin_capability WHERE user_id = $1 AND capability = $2`,
      [userId, capability],
    );
    return parseInt(res.rows[0]?.count || '0', 10) > 0;
  }

  async setCapabilities(userId: string, capabilities: string[], grantedBy?: string): Promise<string[]> {
    for (const cap of capabilities) {
      if (!ADMIN_CAPABILITIES.includes(cap as AdminCapability)) {
        throw new PdValidationError(`Invalid capability '${cap}'`);
      }
    }

    await query(`DELETE FROM pd_admin_capability WHERE user_id = $1`, [userId]);
    for (const cap of capabilities) {
      await query(
        `INSERT INTO pd_admin_capability (user_id, capability, granted_by, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, cap, grantedBy || null],
      );
    }

    return this.getUserCapabilities(userId);
  }
}

export const adminCapabilityService = new AdminCapabilityService();
