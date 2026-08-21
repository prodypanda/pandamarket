import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentGateway } from '@pandamarket/types';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  getPaymentProvider: vi.fn(),
  decryptVendorConfig: vi.fn(),
  getById: vi.fn(),
  cancelUnstartedPaymentOrder: vi.fn(),
  markPaidInTransaction: vi.fn(),
  getStoreById: vi.fn(),
  enqueuePaymentCompensation: vi.fn(),
  enqueuePaymentReconciliation: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../plugins/payment', () => ({
  getPaymentProvider: mocks.getPaymentProvider,
  decryptVendorConfig: mocks.decryptVendorConfig,
}));
vi.mock('../services/order.service', () => ({
  orderService: {
    getById: mocks.getById,
    cancelUnstartedPaymentOrder: mocks.cancelUnstartedPaymentOrder,
    markPaidInTransaction: mocks.markPaidInTransaction,
  },
}));
vi.mock('../services/store.service', () => ({
  storeService: { getById: mocks.getStoreById },
}));
vi.mock('../queues/payment-reconciliation-queue', () => ({
  enqueuePaymentCompensation: mocks.enqueuePaymentCompensation,
  enqueuePaymentReconciliation: mocks.enqueuePaymentReconciliation,
}));

import { PaymentReconciliationService } from '../services/payment-reconciliation.service';

const unknownAttempt = {
  id: 'pa_unknown',
  order_id: 'ord_123',
  gateway: PaymentGateway.Flouci,
  gateway_reference: 'flouci_ref_123',
  expected_amount_minor: '85000',
  expected_currency: 'TND',
  merchant_account_id: null,
  status: 'initialization_unknown',
  provider_state: 'unknown',
  reconciliation_status: 'queued',
  reconciliation_attempts: 0,
  next_reconciliation_at: null,
  provider_expected_amount_minor: null,
  provider_expected_currency: null,
};

describe('PaymentReconciliationService', () => {
  let service: PaymentReconciliationService;

  beforeEach(() => {
    mocks.query.mockReset();
    mocks.transaction.mockReset();
    mocks.getPaymentProvider.mockReset();
    mocks.decryptVendorConfig.mockReset();
    mocks.getById.mockReset();
    mocks.cancelUnstartedPaymentOrder.mockReset();
    mocks.markPaidInTransaction.mockReset();
    mocks.getStoreById.mockReset();
    mocks.enqueuePaymentCompensation.mockReset();
    mocks.enqueuePaymentReconciliation.mockReset();
    mocks.transaction.mockImplementation(async (callback: (client: { query: typeof mocks.query }) => Promise<unknown>) => (
      callback({ query: mocks.query })
    ));
    mocks.enqueuePaymentReconciliation.mockResolvedValue(undefined);
    mocks.enqueuePaymentCompensation.mockResolvedValue(undefined);
    mocks.cancelUnstartedPaymentOrder.mockResolvedValue('cancelled');
    mocks.markPaidInTransaction.mockResolvedValue({ id: 'ord_123' });
    service = new PaymentReconciliationService();
  });

  it('moves a timeout-created payment to captured atomically after reconciliation', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [unknownAttempt], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'ord_123' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mocks.getPaymentProvider.mockReturnValue({
      verify: vi.fn().mockResolvedValue({
        status: 'captured',
        amount: 85,
        metadata: { currency: 'TND' },
      }),
    });

    await expect(service.reconcileAttempt('pa_unknown')).resolves.toBe('captured');
    expect(mocks.markPaidInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.any(Function) }),
      'ord_123',
      PaymentGateway.Flouci,
      'flouci_ref_123',
    );
  });

  it('escalates a captured provider payment to manual review when the order has another capture', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [unknownAttempt], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'ord_123' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mocks.getPaymentProvider.mockReturnValue({
      verify: vi.fn().mockResolvedValue({
        status: 'captured',
        amount: 85,
        metadata: { currency: 'TND' },
      }),
    });
    const { PdConflictError, PdErrorCode } = await import('../errors');
    mocks.markPaidInTransaction.mockRejectedValueOnce(
      new PdConflictError(PdErrorCode.PAY_ALREADY_CAPTURED, 'Different payment capture'),
    );

    await expect(service.reconcileAttempt('pa_unknown')).resolves.toBe('manual_review');
    expect(mocks.query.mock.calls.some(([sql, params]) =>
      String(sql).includes("reconciliation_status = 'manual_review'")
      && Array.isArray(params)
      && params.includes('pa_unknown')),
    ).toBe(true);
  });

  it('does not repeat completed compensation', async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{ order_id: 'ord_123', compensation_status: 'completed' }],
      rowCount: 1,
    });

    await expect(service.compensateAttempt('pa_failed')).resolves.toBe('completed');
    expect(mocks.cancelUnstartedPaymentOrder).not.toHaveBeenCalled();
  });

  it('marks active payment sessions for manual review instead of restoring inventory', async () => {
    mocks.query
      .mockResolvedValueOnce({
        rows: [{ order_id: 'ord_123', compensation_status: 'pending' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mocks.cancelUnstartedPaymentOrder.mockResolvedValueOnce('active_attempt');

    await expect(service.compensateAttempt('pa_failed')).resolves.toBe('manual_review');
    expect(mocks.cancelUnstartedPaymentOrder).toHaveBeenCalledWith(
      'ord_123',
      expect.stringContaining('provider confirmed'),
      'pa_failed',
    );
  });
});
