/**
 * Manual Mandat Minute provider — there is no remote gateway.
 * `init()` simply returns a redirect to the in-app upload page;
 * `verify()` queries the local mandat_proofs table.
 */

import {
  PaymentInitContext,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';
import { PaymentGateway, MandatStatus } from '@pandamarket/types';
import { query } from '../../db/pool';

export class ManualMandatProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.ManualMandat;

  async init(ctx: PaymentInitContext): Promise<PaymentInitResult> {
    // No external call. Frontend will route the customer to the upload page.
    return {
      redirect_url: `/orders/${ctx.order_id}/mandat-upload`,
      gateway_reference: ctx.order_id,
      metadata: {
        instructions: {
          recipient: 'PandaMarket SARL',
          city: 'Tunis',
          reference: `PD-ORDER-${ctx.order_id.slice(-8).toUpperCase()}`,
          amount: ctx.amount,
        },
      },
    };
  }

  async verify(reference: string): Promise<PaymentVerifyResult> {
    const { rows } = await query<{ status: MandatStatus; amount_expected: string }>(
      `SELECT status, amount_expected
       FROM pd_mandat_proofs
       WHERE order_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [reference],
    );
    const row = rows[0];
    if (!row) return { status: 'pending' };
    return {
      status:
        row.status === MandatStatus.Approved
          ? 'captured'
          : row.status === MandatStatus.Rejected
            ? 'failed'
            : 'pending',
      amount: parseFloat(row.amount_expected),
    };
  }
}

export const manualMandatProvider = new ManualMandatProvider();
