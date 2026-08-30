import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockNotificationCreate } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockNotificationCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock('../db/pool', () => ({ query: mockQuery }));

vi.mock('../db/redis', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
}));

vi.mock('../services/notification.service', () => ({
  notificationService: { create: mockNotificationCreate },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { orderMonitoringService } from '../services/order-monitoring.service';

describe('Order monitoring sweep (audit 5.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires nothing when every check comes back clean', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      void sql;
      return { rows: [] };
    });

    await orderMonitoringService.sweep();

    // Only the 4 check queries run — no system-log insert, no admin notifications
    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it('writes a system log and notifies admins when the COD capture leak fires', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      const q = String(sql);
      if (q.includes("payment_gateway = 'cod'")) {
        return { rows: [{ id: 'ord_leak_1', payment_status: 'pending' }] };
      }
      if (q.includes('INSERT INTO pd_system_log')) return { rowCount: 1 };
      if (q.includes("role IN ('admin', 'super_admin')")) return { rows: [{ id: 'admin_1' }] };
      return { rows: [] };
    });

    await orderMonitoringService.sweep();

    const sysLogCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO pd_system_log'));
    expect(sysLogCall).toBeDefined();
    // level=$2 error, event_type=$3 = order_monitoring.<check>
    expect(sysLogCall![1]).toContain('error');
    expect(String(sysLogCall![1][2])).toContain('order_monitoring.cod_capture_leak');

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'admin_1', type: 'monitoring_alert' }),
    );
  });

  it('flags delivered fulfillments whose order never reached a terminal status', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      const q = String(sql);
      if (q.includes("f.status = 'delivered'")) {
        return { rows: [{ id: 'ord_stuck_1', status: 'pending', delivered_at: new Date() }] };
      }
      if (q.includes('INSERT INTO pd_system_log')) return { rowCount: 1 };
      if (q.includes("role IN ('admin', 'super_admin')")) return { rows: [{ id: 'admin_1' }] };
      return { rows: [] };
    });

    await orderMonitoringService.sweep();

    const sysLogCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO pd_system_log'));
    expect(sysLogCall).toBeDefined();
    expect(String(sysLogCall![1][2])).toContain('order_monitoring.delivered_desync');
  });

  it('flags refunds debiting more than the credited sale amount', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      const q = String(sql);
      if (q.includes("w.type = 'refund'")) {
        return { rows: [{ order_id: 'ord_asym', store_id: 'store_1', debited: '120.000', credited: '92.000' }] };
      }
      if (q.includes('INSERT INTO pd_system_log')) return { rowCount: 1 };
      if (q.includes("role IN ('admin', 'super_admin')")) return { rows: [{ id: 'admin_1' }] };
      return { rows: [] };
    });

    await orderMonitoringService.sweep();

    const sysLogCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO pd_system_log'));
    expect(sysLogCall).toBeDefined();
    expect(String(sysLogCall![1][2])).toContain('order_monitoring.refund_debit_asymmetry');
  });
});
