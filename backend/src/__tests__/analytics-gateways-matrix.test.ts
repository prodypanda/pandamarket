/**
 * Analytics Payment Gateways Reliability & Conversion Matrix Test Suite — Package 1
 * Features Covered:
 *   - Feature 6: Payment Gateway Reliability & Conversion Matrix (R2)
 *     - Supported Gateways: Flouci, Konnect, Manual Mandat, Stripe, PayPal, COD
 *     - Success Rate %, Captured vs Failed Attempts
 *     - Transaction Volume in TND
 *     - End-to-End Processing Latency Tracking (seconds)
 *     - Estimated Gateway Processing Fees
 *     - Granular Failure Error Classification & Taxonomy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdValidationError } from '../errors';

export type PaymentGatewayType =
  | 'flouci'
  | 'konnect'
  | 'manual_mandat'
  | 'stripe'
  | 'paypal'
  | 'cod';

export type PaymentFailureReason =
  | 'card_declined'
  | 'insufficient_funds'
  | 'gateway_timeout'
  | '3ds_failed'
  | 'session_expired'
  | 'user_cancelled'
  | 'cod_refused_at_door'
  | 'invalid_credentials'
  | 'mandat_rejected';

export interface PaymentAttemptRecord {
  id: string;
  order_id: string;
  gateway: PaymentGatewayType;
  amount_tnd: number;
  status: 'captured' | 'failed' | 'pending';
  failure_reason?: PaymentFailureReason | null;
  latency_ms: number; // Duration from initialization to webhook / capture
  created_at: string;
  settled_at?: string | null;
}

export interface PaymentGatewayFeeConfig {
  percentage_rate: number; // e.g. 0.015 for 1.5%
  fixed_fee_tnd: number; // e.g. 0.300 TND
}

export const GATEWAY_FEE_SCHEDULE: Record<PaymentGatewayType, PaymentGatewayFeeConfig> = {
  flouci: { percentage_rate: 0.015, fixed_fee_tnd: 0.000 }, // 1.5% flat
  konnect: { percentage_rate: 0.025, fixed_fee_tnd: 0.300 }, // 2.5% + 300 millimes
  stripe: { percentage_rate: 0.029, fixed_fee_tnd: 0.300 }, // 2.9% + 300 millimes
  paypal: { percentage_rate: 0.034, fixed_fee_tnd: 0.350 }, // 3.4% + 350 millimes
  manual_mandat: { percentage_rate: 0.000, fixed_fee_tnd: 0.000 }, // 0% platform fee
  cod: { percentage_rate: 0.000, fixed_fee_tnd: 0.000 }, // 0% gateway fee
};

export const GATEWAY_DISPLAY_NAMES: Record<PaymentGatewayType, string> = {
  flouci: 'Flouci (Mobile Wallet & Konnect)',
  konnect: 'Konnect Gateway (Cards & Gstore)',
  manual_mandat: 'Mandat Minute (La Poste Tunisienne)',
  stripe: 'Stripe International (Credit/Debit Cards)',
  paypal: 'PayPal International',
  cod: 'Cash on Delivery (COD Courier)',
};

export interface PaymentGatewayReliabilityItem {
  gateway: PaymentGatewayType;
  display_name: string;
  total_attempts: number;
  successful_captures: number;
  failed_attempts: number;
  pending_attempts: number;
  success_rate_pct: number;
  total_volume_tnd: number;
  avg_latency_seconds: number;
  estimated_gateway_fees_tnd: number;
  error_breakdown: Record<string, number>;
}

export interface GatewayReliabilityMatrixResponse {
  total_attempts_all_gateways: number;
  total_successful_all_gateways: number;
  overall_success_rate_pct: number;
  total_volume_all_gateways_tnd: number;
  total_estimated_fees_tnd: number;
  gateways: PaymentGatewayReliabilityItem[];
}

export function computeGatewayReliabilityMatrix(
  attempts: PaymentAttemptRecord[],
  feeSchedule = GATEWAY_FEE_SCHEDULE
): GatewayReliabilityMatrixResponse {
  const allGateways: PaymentGatewayType[] = [
    'flouci',
    'konnect',
    'manual_mandat',
    'stripe',
    'paypal',
    'cod',
  ];

  const gatewayStats = new Map<
    PaymentGatewayType,
    {
      attempts: number;
      captured: number;
      failed: number;
      pending: number;
      volumeTnd: number;
      totalLatencyMs: number;
      errors: Record<string, number>;
    }
  >();

  for (const g of allGateways) {
    gatewayStats.set(g, {
      attempts: 0,
      captured: 0,
      failed: 0,
      pending: 0,
      volumeTnd: 0,
      totalLatencyMs: 0,
      errors: {},
    });
  }

  let totalAttemptsAll = 0;
  let totalSuccessfulAll = 0;
  let totalVolumeAll = 0;
  let totalFeesAll = 0;

  for (const att of attempts) {
    if (!allGateways.includes(att.gateway)) {
      throw new PdValidationError(`Unsupported payment gateway: ${att.gateway}`);
    }
    if (att.amount_tnd < 0 || isNaN(att.amount_tnd)) {
      throw new PdValidationError(`Invalid attempt amount: ${att.amount_tnd}`);
    }

    const stat = gatewayStats.get(att.gateway)!;
    stat.attempts += 1;
    totalAttemptsAll += 1;
    stat.totalLatencyMs += att.latency_ms > 0 ? att.latency_ms : 0;

    if (att.status === 'captured') {
      stat.captured += 1;
      stat.volumeTnd += att.amount_tnd;
      totalSuccessfulAll += 1;
      totalVolumeAll += att.amount_tnd;
    } else if (att.status === 'failed') {
      stat.failed += 1;
      const reason = att.failure_reason || 'unknown_error';
      stat.errors[reason] = (stat.errors[reason] || 0) + 1;
    } else if (att.status === 'pending') {
      stat.pending += 1;
    }
  }

  const items: PaymentGatewayReliabilityItem[] = allGateways.map((g) => {
    const s = gatewayStats.get(g)!;
    const feeConfig = feeSchedule[g] || { percentage_rate: 0, fixed_fee_tnd: 0 };

    const successRatePct =
      s.attempts > 0 ? Math.round((s.captured / s.attempts) * 10000) / 100 : 0.0;

    const avgLatencySeconds =
      s.attempts > 0 ? Math.round((s.totalLatencyMs / s.attempts / 1000) * 100) / 100 : 0.0;

    // Fees apply to captured orders
    const estimatedFees =
      s.volumeTnd * feeConfig.percentage_rate + s.captured * feeConfig.fixed_fee_tnd;
    const estimatedFeesTnd = Math.round(estimatedFees * 1000) / 1000;

    totalFeesAll += estimatedFeesTnd;

    return {
      gateway: g,
      display_name: GATEWAY_DISPLAY_NAMES[g],
      total_attempts: s.attempts,
      successful_captures: s.captured,
      failed_attempts: s.failed,
      pending_attempts: s.pending,
      success_rate_pct: successRatePct,
      total_volume_tnd: Math.round(s.volumeTnd * 1000) / 1000,
      avg_latency_seconds: avgLatencySeconds,
      estimated_gateway_fees_tnd: estimatedFeesTnd,
      error_breakdown: s.errors,
    };
  });

  const overallSuccessRatePct =
    totalAttemptsAll > 0
      ? Math.round((totalSuccessfulAll / totalAttemptsAll) * 10000) / 100
      : 0.0;

  return {
    total_attempts_all_gateways: totalAttemptsAll,
    total_successful_all_gateways: totalSuccessfulAll,
    overall_success_rate_pct: overallSuccessRatePct,
    total_volume_all_gateways_tnd: Math.round(totalVolumeAll * 1000) / 1000,
    total_estimated_fees_tnd: Math.round(totalFeesAll * 1000) / 1000,
    gateways: items,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Feature 6: Payment Gateway Reliability & Conversion Matrix (R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Tier 1: Happy Path & Core Metrics (≥ 5 tests)
  // ==========================================================================
  describe('Tier 1: Core Gateway Reliability Calculations & Happy Path', () => {
    it('T1.1: aggregates all 6 distinct payment gateways (Flouci, Konnect, Mandat, Stripe, PayPal, COD)', () => {
      const result = computeGatewayReliabilityMatrix([]);
      expect(result.gateways).toHaveLength(6);
      const gatewayKeys = result.gateways.map((g) => g.gateway);
      expect(gatewayKeys).toEqual(['flouci', 'konnect', 'manual_mandat', 'stripe', 'paypal', 'cod']);
    });

    it('T1.2: calculates gateway success rate percentage accurately (captured / attempts * 100)', () => {
      const attempts: PaymentAttemptRecord[] = [
        // Flouci: 8 captured out of 10 -> 80.00%
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `f_cap_${i}`,
          order_id: `ord_${i}`,
          gateway: 'flouci' as const,
          amount_tnd: 100,
          status: 'captured' as const,
          latency_ms: 1200,
          created_at: '2026-08-14T10:00:00Z',
        })),
        ...Array.from({ length: 2 }, (_, i) => ({
          id: `f_fail_${i}`,
          order_id: `ord_f_${i}`,
          gateway: 'flouci' as const,
          amount_tnd: 100,
          status: 'failed' as const,
          failure_reason: 'card_declined' as const,
          latency_ms: 800,
          created_at: '2026-08-14T10:00:00Z',
        })),
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const flouci = matrix.gateways.find((g) => g.gateway === 'flouci')!;

      expect(flouci.total_attempts).toBe(10);
      expect(flouci.successful_captures).toBe(8);
      expect(flouci.failed_attempts).toBe(2);
      expect(flouci.success_rate_pct).toBe(80.0);
      expect(flouci.total_volume_tnd).toBe(800);
    });

    it('T1.3: computes average processing latency in seconds accurately', () => {
      const attempts: PaymentAttemptRecord[] = [
        { id: '1', order_id: 'o1', gateway: 'konnect', amount_tnd: 50, status: 'captured', latency_ms: 1500, created_at: '2026-08-14T10:00:00Z' },
        { id: '2', order_id: 'o2', gateway: 'konnect', amount_tnd: 50, status: 'captured', latency_ms: 2500, created_at: '2026-08-14T10:00:00Z' },
      ]; // Avg: (1500 + 2500) / 2 = 2000ms = 2.00s

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const konnect = matrix.gateways.find((g) => g.gateway === 'konnect')!;
      expect(konnect.avg_latency_seconds).toBe(2.0);
    });

    it('T1.4: computes estimated gateway processing fees based on fee schedules', () => {
      // Flouci: 1.5% on 2,000 TND = 30.000 TND
      // Konnect: 2.5% on 1,000 TND + (2 * 0.300) = 25.000 + 0.600 = 25.600 TND
      // Stripe: 2.9% on 1,000 TND + (1 * 0.300) = 29.000 + 0.300 = 29.300 TND
      const attempts: PaymentAttemptRecord[] = [
        { id: '1', order_id: 'o1', gateway: 'flouci', amount_tnd: 2000, status: 'captured', latency_ms: 1000, created_at: '2026-08-14T10:00:00Z' },
        { id: '2', order_id: 'o2', gateway: 'konnect', amount_tnd: 500, status: 'captured', latency_ms: 1000, created_at: '2026-08-14T10:00:00Z' },
        { id: '3', order_id: 'o3', gateway: 'konnect', amount_tnd: 500, status: 'captured', latency_ms: 1000, created_at: '2026-08-14T10:00:00Z' },
        { id: '4', order_id: 'o4', gateway: 'stripe', amount_tnd: 1000, status: 'captured', latency_ms: 1000, created_at: '2026-08-14T10:00:00Z' },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const flouci = matrix.gateways.find((g) => g.gateway === 'flouci')!;
      const konnect = matrix.gateways.find((g) => g.gateway === 'konnect')!;
      const stripe = matrix.gateways.find((g) => g.gateway === 'stripe')!;

      expect(flouci.estimated_gateway_fees_tnd).toBe(30);
      expect(konnect.estimated_gateway_fees_tnd).toBe(25.6);
      expect(stripe.estimated_gateway_fees_tnd).toBe(29.3);
      expect(matrix.total_estimated_fees_tnd).toBe(84.9);
    });

    it('T1.5: classifies and breaks down granular payment failure reasons', () => {
      const attempts: PaymentAttemptRecord[] = [
        { id: '1', order_id: 'o1', gateway: 'flouci', amount_tnd: 100, status: 'failed', failure_reason: 'card_declined', latency_ms: 500, created_at: '2026-08-14T10:00:00Z' },
        { id: '2', order_id: 'o2', gateway: 'flouci', amount_tnd: 100, status: 'failed', failure_reason: 'card_declined', latency_ms: 500, created_at: '2026-08-14T10:00:00Z' },
        { id: '3', order_id: 'o3', gateway: 'flouci', amount_tnd: 100, status: 'failed', failure_reason: '3ds_failed', latency_ms: 500, created_at: '2026-08-14T10:00:00Z' },
        { id: '4', order_id: 'o4', gateway: 'flouci', amount_tnd: 100, status: 'failed', failure_reason: 'gateway_timeout', latency_ms: 500, created_at: '2026-08-14T10:00:00Z' },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const flouci = matrix.gateways.find((g) => g.gateway === 'flouci')!;

      expect(flouci.error_breakdown['card_declined']).toBe(2);
      expect(flouci.error_breakdown['3ds_failed']).toBe(1);
      expect(flouci.error_breakdown['gateway_timeout']).toBe(1);
    });

    it('T1.6: computes overall cross-gateway volume and success rate accurately', () => {
      const attempts: PaymentAttemptRecord[] = [
        { id: '1', order_id: 'o1', gateway: 'flouci', amount_tnd: 200, status: 'captured', latency_ms: 1000, created_at: '2026-08-14T10:00:00Z' },
        { id: '2', order_id: 'o2', gateway: 'cod', amount_tnd: 100, status: 'captured', latency_ms: 500, created_at: '2026-08-14T10:00:00Z' },
        { id: '3', order_id: 'o3', gateway: 'stripe', amount_tnd: 100, status: 'failed', failure_reason: 'card_declined', latency_ms: 500, created_at: '2026-08-14T10:00:00Z' },
      ]; // 2 captured out of 3 attempts = 66.67% overall success rate, 300 TND volume

      const matrix = computeGatewayReliabilityMatrix(attempts);
      expect(matrix.total_attempts_all_gateways).toBe(3);
      expect(matrix.total_successful_all_gateways).toBe(2);
      expect(matrix.overall_success_rate_pct).toBe(66.67);
      expect(matrix.total_volume_all_gateways_tnd).toBe(300);
    });
  });

  // ==========================================================================
  // Tier 2: Boundary & Edge Cases (≥ 5 tests)
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: handles gateways with 0 attempts during time window (zero division guard)', () => {
      const matrix = computeGatewayReliabilityMatrix([]);
      for (const g of matrix.gateways) {
        expect(g.total_attempts).toBe(0);
        expect(g.successful_captures).toBe(0);
        expect(g.success_rate_pct).toBe(0);
        expect(g.avg_latency_seconds).toBe(0);
        expect(g.total_volume_tnd).toBe(0);
        expect(g.estimated_gateway_fees_tnd).toBe(0);
      }
      expect(matrix.overall_success_rate_pct).toBe(0);
    });

    it('T2.2: handles 100% gateway success rate without rounding distortion', () => {
      const attempts: PaymentAttemptRecord[] = [
        { id: '1', order_id: 'o1', gateway: 'flouci', amount_tnd: 250, status: 'captured', latency_ms: 1100, created_at: '2026-08-14T10:00:00Z' },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const flouci = matrix.gateways.find((g) => g.gateway === 'flouci')!;
      expect(flouci.success_rate_pct).toBe(100.0);
      expect(flouci.failed_attempts).toBe(0);
    });

    it('T2.3: handles 100% gateway failure rate with zero captured volume', () => {
      const attempts: PaymentAttemptRecord[] = [
        { id: '1', order_id: 'o1', gateway: 'paypal', amount_tnd: 500, status: 'failed', failure_reason: 'user_cancelled', latency_ms: 3000, created_at: '2026-08-14T10:00:00Z' },
        { id: '2', order_id: 'o2', gateway: 'paypal', amount_tnd: 500, status: 'failed', failure_reason: 'session_expired', latency_ms: 60000, created_at: '2026-08-14T10:00:00Z' },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const paypal = matrix.gateways.find((g) => g.gateway === 'paypal')!;
      expect(paypal.success_rate_pct).toBe(0);
      expect(paypal.total_volume_tnd).toBe(0);
      expect(paypal.estimated_gateway_fees_tnd).toBe(0);
      expect(paypal.error_breakdown['user_cancelled']).toBe(1);
      expect(paypal.error_breakdown['session_expired']).toBe(1);
    });

    it('T2.4: handles pending offline asynchronous payment lifecycle (Manual Mandat)', () => {
      const attempts: PaymentAttemptRecord[] = [
        { id: 'm1', order_id: 'o1', gateway: 'manual_mandat', amount_tnd: 1200, status: 'pending', latency_ms: 0, created_at: '2026-08-14T10:00:00Z' },
        { id: 'm2', order_id: 'o2', gateway: 'manual_mandat', amount_tnd: 800, status: 'captured', latency_ms: 86400000, created_at: '2026-08-13T10:00:00Z', settled_at: '2026-08-14T10:00:00Z' },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const mandat = matrix.gateways.find((g) => g.gateway === 'manual_mandat')!;
      expect(mandat.pending_attempts).toBe(1);
      expect(mandat.successful_captures).toBe(1);
      expect(mandat.total_volume_tnd).toBe(800); // Only captured volume
      expect(mandat.estimated_gateway_fees_tnd).toBe(0); // 0% fee
    });

    it('T2.5: handles Cash On Delivery refusal / return at door failure reason', () => {
      const attempts: PaymentAttemptRecord[] = [
        { id: 'c1', order_id: 'o1', gateway: 'cod', amount_tnd: 75, status: 'captured', latency_ms: 0, created_at: '2026-08-14T10:00:00Z' },
        { id: 'c2', order_id: 'o2', gateway: 'cod', amount_tnd: 75, status: 'failed', failure_reason: 'cod_refused_at_door', latency_ms: 0, created_at: '2026-08-14T10:00:00Z' },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const cod = matrix.gateways.find((g) => g.gateway === 'cod')!;
      expect(cod.success_rate_pct).toBe(50.0);
      expect(cod.error_breakdown['cod_refused_at_door']).toBe(1);
    });

    it('T2.6: throws PdValidationError when unsupported gateway or invalid negative amount is passed', () => {
      const invalidGateway = [
        { id: 'inv', order_id: 'o', gateway: 'bitcoin' as any, amount_tnd: 100, status: 'captured' as const, latency_ms: 100, created_at: '2026-08-14T10:00:00Z' },
      ];
      expect(() => computeGatewayReliabilityMatrix(invalidGateway)).toThrow(PdValidationError);

      const negativeAmount = [
        { id: 'neg', order_id: 'o', gateway: 'flouci' as const, amount_tnd: -50, status: 'captured' as const, latency_ms: 100, created_at: '2026-08-14T10:00:00Z' },
      ];
      expect(() => computeGatewayReliabilityMatrix(negativeAmount)).toThrow(PdValidationError);
    });
  });

  // ==========================================================================
  // Tier 3: Combinatorial & High-Volume Cross-Gateway Scenarios
  // ==========================================================================
  describe('Tier 3: Complex Cross-Gateway Workloads & Fallover Attribution', () => {
    it('T3.1: tracks buyer failover scenario (fails Flouci -> falls back to Konnect -> succeeds)', () => {
      const customerOrderAttempts: PaymentAttemptRecord[] = [
        // Attempt 1: Failed on Flouci due to 3DS timeout
        {
          id: 'att_flouci_fail',
          order_id: 'ord_123',
          gateway: 'flouci',
          amount_tnd: 240.500,
          status: 'failed',
          failure_reason: '3ds_failed',
          latency_ms: 15_000,
          created_at: '2026-08-14T11:00:00Z',
        },
        // Attempt 2: Succeeded on Konnect
        {
          id: 'att_konnect_success',
          order_id: 'ord_123',
          gateway: 'konnect',
          amount_tnd: 240.500,
          status: 'captured',
          latency_ms: 2_400,
          created_at: '2026-08-14T11:01:00Z',
        },
      ];

      const matrix = computeGatewayReliabilityMatrix(customerOrderAttempts);
      const flouci = matrix.gateways.find((g) => g.gateway === 'flouci')!;
      const konnect = matrix.gateways.find((g) => g.gateway === 'konnect')!;

      expect(flouci.total_attempts).toBe(1);
      expect(flouci.failed_attempts).toBe(1);
      expect(flouci.success_rate_pct).toBe(0.0);

      expect(konnect.total_attempts).toBe(1);
      expect(konnect.successful_captures).toBe(1);
      expect(konnect.success_rate_pct).toBe(100.0);
      expect(konnect.total_volume_tnd).toBe(240.5);

      // Overall attempts = 2, captured = 1 -> 50.0% conversion
      expect(matrix.total_attempts_all_gateways).toBe(2);
      expect(matrix.total_successful_all_gateways).toBe(1);
      expect(matrix.overall_success_rate_pct).toBe(50.0);
    });

    it('T3.2: processes high-volume production batch (1,200 payment attempts) across all gateways', () => {
      const gatewaysList: PaymentGatewayType[] = ['flouci', 'konnect', 'manual_mandat', 'stripe', 'paypal', 'cod'];
      const largeBatch: PaymentAttemptRecord[] = Array.from({ length: 1200 }, (_, i) => {
        const gw = gatewaysList[i % gatewaysList.length];
        const isSuccess = i % 5 !== 0; // 80% success rate
        return {
          id: `att_${i}`,
          order_id: `ord_${Math.floor(i / 2)}`,
          gateway: gw,
          amount_tnd: 50 + (i % 200),
          status: isSuccess ? 'captured' : 'failed',
          failure_reason: isSuccess ? null : 'card_declined',
          latency_ms: 800 + (i % 1200),
          created_at: '2026-08-14T10:00:00Z',
        };
      });

      const matrix = computeGatewayReliabilityMatrix(largeBatch);

      expect(matrix.total_attempts_all_gateways).toBe(1200);
      expect(matrix.total_successful_all_gateways).toBe(960);
      expect(matrix.overall_success_rate_pct).toBe(80.0);
      expect(matrix.total_volume_all_gateways_tnd).toBeGreaterThan(100_000);
      expect(matrix.total_estimated_fees_tnd).toBeGreaterThan(0);

      for (const g of matrix.gateways) {
        expect(g.total_attempts).toBe(200);
        expect(g.successful_captures).toBe(160);
        expect(g.failed_attempts).toBe(40);
        expect(g.success_rate_pct).toBe(80.0);
      }
    });
  });
});
