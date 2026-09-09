'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { useDashboardStyle } from '@/contexts/DashboardStyleContext';
import {
  CourierReGoConsole,
  type CourierPackage,
} from '@/components/dashboard/rego/CourierReGoConsole';
import { Loader2 } from 'lucide-react';

export default function CourierConsolePage() {
  const { dashboardStyle } = useDashboardStyle();
  const [packages, setPackages] = useState<CourierPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/api/pd/orders?status=shipped&limit=50', {
        credentials: 'include',
      });
      if (!res.ok) {
        setPackages([]);
        return;
      }
      const json = await res.json();
      const rawOrders = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.orders)
          ? json.orders
          : [];

      const mapped: CourierPackage[] = rawOrders.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number
          ? `#${o.order_number}`
          : o.id
            ? `#ORD-${o.id.slice(-6).toUpperCase()}`
            : '#ORD-000000',
        recipientName:
          o.shipping_address?.full_name ||
          o.shipping_address?.name ||
          o.customer_name ||
          'Client Destinataire',
        phone:
          o.shipping_address?.phone ||
          o.customer_phone ||
          o.phone ||
          '+216',
        address:
          o.shipping_address?.address_line_1 ||
          o.shipping_address?.street ||
          'Adresse de livraison',
        city: o.shipping_address?.city || 'Tunis',
        governorate: o.shipping_address?.state || o.governorate,
        codAmount:
          parseFloat(o.total_amount || o.total || o.amount) || 0,
        status:
          o.status === 'delivered'
            ? 'delivered'
            : o.status === 'cancelled' || o.status === 'rto'
              ? 'failed'
              : 'out_for_delivery',
        notes: o.customer_notes || o.notes,
        itemsSummary: Array.isArray(o.items)
          ? o.items.map((it: any) => `${it.quantity}x ${it.title}`).join(', ')
          : undefined,
      }));

      setPackages(mapped);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const handleVerifyOtp = async (pkg: CourierPackage, code: string): Promise<boolean> => {
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${pkg.id}/cod-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? { ...p, status: 'delivered' } : p))
        );
        return true;
      }

      // Secondary verification fallback
      const fallbackRes = await fetchWithCsrf(`/api/pd/orders/${pkg.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'delivered' }),
      });
      if (fallbackRes.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? { ...p, status: 'delivered' } : p))
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleReportFailed = async (pkg: CourierPackage, reason: string) => {
    try {
      await fetchWithCsrf(`/api/pd/orders/store/${pkg.id}/rto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason_code: 'failed_delivery', notes: reason }),
      });
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: 'failed' } : p))
      );
    } catch {
      // Non-blocking UI update
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: 'failed' } : p))
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center p-8 bg-[var(--rego-bg,#ffffff)]">
        <div className="flex items-center gap-2.5 text-xs font-bold text-[var(--rego-ink-2,#737373)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--rego-accent,#ad0505)]" />
          <span>Chargement de la tournée de livraison...</span>
        </div>
      </div>
    );
  }

  return (
    <CourierReGoConsole
      packages={packages}
      loading={loading}
      onRefresh={loadPackages}
      onVerifyDeliveryOtp={handleVerifyOtp}
      onReportDeliveryFailed={handleReportFailed}
    />
  );
}
