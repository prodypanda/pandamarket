import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from '../services/payment.service';
import { PaymentGateway } from '@pandamarket/types';
import * as db from '../db/pool';
import { orderService } from '../services/order.service';

vi.mock('../db/pool');
vi.mock('../services/order.service');

describe('PaymentService.syncOrderPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns captured immediately if order is already captured', async () => {
    vi.mocked(orderService.getById).mockResolvedValueOnce({
      id: 'ord_123',
      payment_status: 'captured',
    } as never);

    const result = await paymentService.syncOrderPayment('ord_123');
    expect(result).toEqual({ captured: true, payment_status: 'captured' });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('returns current status if no matching initialized attempt exists', async () => {
    vi.mocked(orderService.getById).mockResolvedValueOnce({
      id: 'ord_123',
      payment_status: 'payment_required',
    } as never);

    vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as never);

    const result = await paymentService.syncOrderPayment('ord_123');
    expect(result).toEqual({ captured: false, payment_status: 'payment_required' });
  });

  it('invokes processPaymentWebhook with gatewayReference for syncable gateways', async () => {
    vi.mocked(orderService.getById)
      .mockResolvedValueOnce({
        id: 'ord_123',
        payment_status: 'pending',
      } as never)
      .mockResolvedValueOnce({
        id: 'ord_123',
        payment_status: 'captured',
      } as never);

    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          gateway: PaymentGateway.PayPal,
          gateway_reference: '5O190127TN364715T',
        },
      ],
    } as never);

    const processWebhookSpy = vi
      .spyOn(paymentService, 'processPaymentWebhook')
      .mockResolvedValueOnce(true);

    const result = await paymentService.syncOrderPayment('ord_123');

    expect(processWebhookSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: PaymentGateway.PayPal,
        gatewayReference: '5O190127TN364715T',
        orderId: 'ord_123',
      }),
    );
    expect(result).toEqual({ captured: true, payment_status: 'captured' });
  });
});
