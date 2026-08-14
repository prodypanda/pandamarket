/**
 * Adversarial Empirical Stress Test Suite for Live Pulse 60s Ring Buffer,
 * Anomaly Alert Thresholds, and 24-Governorate / Diaspora Geo Heatmap Telemetry.
 *
 * Authored by: challenger_m1_2 (Empirical Challenger)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LivePulseRingBuffer,
  compute60sVelocityChart,
  evaluateCheckoutMicroTickerAndAnomalies,
  normalizeTunisiaGovernorate,
  maskCustomerName,
  TUNISIA_GOVERNORATES_META,
  DIASPORA_COUNTRIES_META,
} from '../services/analytics.service';
import {
  TunisiaGovernorateCode,
  LiveCheckoutItem,
  LiveCheckoutTickerItem,
  RawTelemetryEvent,
} from '../types/analytics-types';

describe('Adversarial Empirical Stress Suite — Live Pulse & Geo Telemetry', () => {
  // =========================================================================
  // Section 1: Circular Ring Buffer 60-Slot Aggregation & Microsecond Rollover
  // =========================================================================
  describe('1. LivePulseRingBuffer 60-Slot Rolling Buffer & Microsecond Invariants', () => {
    let ringBuffer: LivePulseRingBuffer;

    beforeEach(() => {
      ringBuffer = new LivePulseRingBuffer();
    });

    it('always outputs exactly 60 slots ordered chronologically with offset 0..59', () => {
      const series = ringBuffer.get60SecondSeries();
      expect(series).toHaveLength(60);

      for (let i = 0; i < 60; i++) {
        expect(series[i].second_offset).toBe(i);
        expect(series[i].second_index).toBe(i);
        if (i > 0) {
          expect(series[i].epoch_second).toBe(series[i - 1].epoch_second + 1);
        }
      }
    });

    it('handles high-frequency bursts (500 events in same second epoch) with accurate visitor deduplication', () => {
      const uniqueVisitors = Array.from({ length: 50 }, (_, i) => `visitor_${i}`);

      // Record 500 events across 50 unique visitors in the exact same second
      for (let i = 0; i < 500; i++) {
        const vHash = uniqueVisitors[i % 50];
        ringBuffer.recordEvent(vHash);
      }

      const series = ringBuffer.get60SecondSeries();
      const currentSlot = series[59]; // Last slot corresponds to current second

      expect(currentSlot.event_count).toBe(500);
      expect(currentSlot.visitor_count).toBe(50);
      expect(currentSlot.active_visitors).toBe(50);
    });

    it('accumulates order velocity and GMV with 3-decimal floating point precision', () => {
      ringBuffer.recordOrder(125.456, 'vis_1');
      ringBuffer.recordOrder(250.543, 'vis_2');
      ringBuffer.recordOrder(10.001, 'vis_1');

      const series = ringBuffer.get60SecondSeries();
      const currentSlot = series[59];

      expect(currentSlot.order_velocity).toBe(3);
      expect(currentSlot.event_count).toBe(3);
      expect(currentSlot.gmv_velocity_tnd).toBe(386.0); // 125.456 + 250.543 + 10.001 = 386.000
    });

    it('caps micro-ticker strictly at MAX_TICKER_ITEMS (20) with LIFO unshift order', () => {
      for (let i = 1; i <= 35; i++) {
        const item: LiveCheckoutTickerItem = {
          id: `ord_${i}`,
          event_type: 'payment_success',
          occurred_at: new Date(Date.now() + i * 100).toISOString(),
          customer_display: `Customer ${i}`,
          customer_role: 'buyer',
          store_id: 'store_1',
          store_name: 'Store 1',
          product_title: `Item ${i}`,
          item_count: 1,
          amount_tnd: 50.0 + i,
          currency: 'TND',
          governorate_code: 'TUN',
          country_code: 'TN',
          status: 'success',
        };
        ringBuffer.addTickerItem(item);
      }

      const ticker = ringBuffer.getTicker();
      expect(ticker).toHaveLength(20);
      expect(ticker[0].id).toBe('ord_35'); // Most recent first
      expect(ticker[19].id).toBe('ord_16');
    });

    it('recordOrder automatically pushes tickerItem to microTicker when provided', () => {
      const tickerItem: LiveCheckoutTickerItem = {
        id: 'ord_whales_1',
        event_type: 'payment_success',
        occurred_at: new Date().toISOString(),
        customer_display: 'M*** T.',
        customer_role: 'buyer',
        store_id: 'store_1',
        store_name: 'Tech Shop',
        product_title: 'MacBook Pro',
        item_count: 1,
        amount_tnd: 6200.0,
        currency: 'TND',
        governorate_code: 'SFA',
        country_code: 'TN',
        status: 'success',
      };

      ringBuffer.recordOrder(6200.0, 'v_buyer_1', tickerItem);

      const ticker = ringBuffer.getTicker();
      expect(ticker.length).toBeGreaterThan(0);
      expect(ticker[0].id).toBe('ord_whales_1');
      expect(ticker[0].amount_tnd).toBe(6200.0);
    });
  });

  // =========================================================================
  // Section 2: compute60sVelocityChart Standalone Aggregation & Edge Cases
  // =========================================================================
  describe('2. compute60sVelocityChart Aggregation Robustness', () => {
    const refTime = new Date('2026-08-14T12:00:00.000Z');
    const refMs = refTime.getTime();

    it('handles an empty event list gracefully', () => {
      const result = compute60sVelocityChart([], refTime);

      expect(result.total_events_60s).toBe(0);
      expect(result.unique_visitors_60s).toBe(0);
      expect(result.checkout_events_60s).toBe(0);
      expect(result.peak_events_per_sec).toBe(0);
      expect(result.points).toHaveLength(60);
      expect(result.points.every((p) => p.event_count === 0 && p.visitor_count === 0)).toBe(true);
    });

    it('ignores invalid timestamps and NaN dates safely without crashing', () => {
      const invalidEvents: RawTelemetryEvent[] = [
        { id: '1', event_type: 'page_view', timestamp: 'invalid-date-string', visitor_hash: 'v1' },
        { id: '2', event_type: 'page_view', timestamp: '', visitor_hash: 'v2' },
        { id: '3', event_type: 'page_view', timestamp: '2026-99-99T99:99:99Z', visitor_hash: 'v3' },
      ];

      const result = compute60sVelocityChart(invalidEvents, refTime);
      expect(result.total_events_60s).toBe(0);
      expect(result.points).toHaveLength(60);
    });

    it('accurately bins boundary events (t - 59s and t 0s)', () => {
      const tMinus59 = new Date(refMs - 59 * 1000).toISOString();
      const tMinus0 = refTime.toISOString();

      const events: RawTelemetryEvent[] = [
        { id: 'e1', event_type: 'page_view', timestamp: tMinus59, visitor_hash: 'v_start' },
        { id: 'e2', event_type: 'order_placed', timestamp: tMinus0, visitor_hash: 'v_end' },
      ];

      const result = compute60sVelocityChart(events, refTime);

      expect(result.total_events_60s).toBe(2);
      expect(result.checkout_events_60s).toBe(1);
      expect(result.unique_visitors_60s).toBe(2);

      // Slot 0 (oldest slot)
      expect(result.points[0].event_count).toBe(1);
      expect(result.points[0].visitor_count).toBe(1);

      // Slot 59 (newest slot)
      expect(result.points[59].event_count).toBe(1);
      expect(result.points[59].checkout_velocity).toBe(1);
    });

    it('drops events older than the 60s sliding window', () => {
      const tMinus75 = new Date(refMs - 75 * 1000).toISOString(); // 75 seconds ago
      const tMinus10 = new Date(refMs - 10 * 1000).toISOString();

      const events: RawTelemetryEvent[] = [
        { id: 'e_stale', event_type: 'page_view', timestamp: tMinus75, visitor_hash: 'v_old' },
        { id: 'e_valid', event_type: 'page_view', timestamp: tMinus10, visitor_hash: 'v_new' },
      ];

      const result = compute60sVelocityChart(events, refTime);
      expect(result.total_events_60s).toBe(1);
      expect(result.unique_visitors_60s).toBe(1);
    });

    it('evaluates peak events per second correctly during a massive spike', () => {
      const spikeTime = new Date(refMs - 30 * 1000).toISOString();
      const spikeEvents: RawTelemetryEvent[] = Array.from({ length: 42 }, (_, i) => ({
        id: `spike_${i}`,
        event_type: i % 2 === 0 ? 'checkout_completed' : 'page_view',
        timestamp: spikeTime,
        visitor_hash: `v_${i}`,
      }));

      const result = compute60sVelocityChart(spikeEvents, refTime);
      expect(result.total_events_60s).toBe(42);
      expect(result.checkout_events_60s).toBe(21);
      expect(result.peak_events_per_sec).toBe(42);
    });
  });

  // =========================================================================
  // Section 3: Anomaly Alerts Threshold Logic & Boundary Value Stress
  // =========================================================================
  describe('3. Anomaly Alerts Logic: Whale Orders, Surge Velocity & Failure Rate Spikes', () => {
    const makeCheckout = (
      id: string,
      status: 'captured' | 'failed' | 'pending',
      amount_tnd: number,
    ): LiveCheckoutItem => ({
      id,
      order_id: `ord_${id}`,
      store_name: 'Store Alpha',
      amount_tnd,
      payment_gateway: 'flouci',
      status,
      governorate_code: 'TUN',
      governorate_name: 'Tunis',
      country_code: 'TN',
      occurred_at: new Date().toISOString(),
    });

    describe('Whale Orders (>= 5,000 TND)', () => {
      it('does NOT trigger whale alert for 4,999.999 TND order', () => {
        const checkouts = [makeCheckout('1', 'captured', 4999.999)];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);
        const whaleAlert = res.anomaly_alerts.find((a) => a.type === 'whale_order_detected');
        expect(whaleAlert).toBeUndefined();
      });

      it('triggers whale alert for exactly 5,000.000 TND order with severity info', () => {
        const checkouts = [makeCheckout('1', 'captured', 5000.0)];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);
        const whaleAlert = res.anomaly_alerts.find((a) => a.type === 'whale_order_detected');

        expect(whaleAlert).toBeDefined();
        expect(whaleAlert?.severity).toBe('info');
        expect(whaleAlert?.level).toBe('info');
        expect(whaleAlert?.threshold).toBe(5000);
        expect(whaleAlert?.value).toBe(5000.0);
        expect(whaleAlert?.title).toBe('High-Value Order Detected');
      });

      it('triggers whale alert for ultra-high transaction (25,000 TND)', () => {
        const checkouts = [makeCheckout('1', 'captured', 25000.0)];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);
        const whaleAlert = res.anomaly_alerts.find((a) => a.type === 'whale_order_detected');

        expect(whaleAlert).toBeDefined();
        expect(whaleAlert?.value).toBe(25000.0);
      });
    });

    describe('Surge Velocity (3x baseline)', () => {
      it('does NOT trigger surge alert when total == 3x baseline (strictly greater than required)', () => {
        // baseline = 10 -> 3x = 30
        const checkouts = Array.from({ length: 30 }, (_, i) =>
          makeCheckout(`c_${i}`, 'captured', 50),
        );
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10);
        const surgeAlert = res.anomaly_alerts.find((a) => a.type === 'gmv_surge');
        expect(surgeAlert).toBeUndefined();
      });

      it('triggers surge alert when total == 31 (> 30 baseline*3) with severity warning', () => {
        const checkouts = Array.from({ length: 31 }, (_, i) =>
          makeCheckout(`c_${i}`, 'captured', 50),
        );
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10);
        const surgeAlert = res.anomaly_alerts.find((a) => a.type === 'gmv_surge');

        expect(surgeAlert).toBeDefined();
        expect(surgeAlert?.severity).toBe('warning');
        expect(surgeAlert?.level).toBe('warning');
        expect(surgeAlert?.threshold).toBe(30);
        expect(surgeAlert?.value).toBe(31);
        expect(surgeAlert?.title).toBe('Checkout Velocity Surge');
      });

      it('respects custom baseline parameter (e.g. baseline = 5 -> triggers at 16)', () => {
        const checkouts = Array.from({ length: 16 }, (_, i) =>
          makeCheckout(`c_${i}`, 'captured', 50),
        );
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 5);
        const surgeAlert = res.anomaly_alerts.find((a) => a.type === 'gmv_surge');
        expect(surgeAlert).toBeDefined();
        expect(surgeAlert?.threshold).toBe(15);
      });
    });

    describe('Failure Rate Spikes (>=30% warning, >=50% critical)', () => {
      it('does NOT trigger alert if sample size total < 5, even with 100% failure rate', () => {
        const checkouts = [
          makeCheckout('1', 'failed', 100),
          makeCheckout('2', 'failed', 100),
          makeCheckout('3', 'failed', 100),
          makeCheckout('4', 'failed', 100),
        ];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
        const failAlert = res.anomaly_alerts.find((a) => a.type === 'failure_spike');
        expect(failAlert).toBeUndefined();
        expect(res.metrics.failure_rate_pct).toBe(100);
      });

      it('does NOT trigger alert if failure rate < 30% on total >= 5', () => {
        const checkouts = [
          makeCheckout('1', 'failed', 100),
          makeCheckout('2', 'captured', 100),
          makeCheckout('3', 'captured', 100),
          makeCheckout('4', 'captured', 100),
          makeCheckout('5', 'captured', 100),
        ]; // 1 / 5 = 20%
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
        const failAlert = res.anomaly_alerts.find((a) => a.type === 'failure_spike');
        expect(failAlert).toBeUndefined();
        expect(res.metrics.failure_rate_pct).toBe(20.0);
      });

      it('triggers WARNING alert when failure rate is between 30% and 49.9%', () => {
        // 10 checkouts: 3 failed -> 30.0%
        const checkouts = [
          makeCheckout('1', 'failed', 100),
          makeCheckout('2', 'failed', 100),
          makeCheckout('3', 'failed', 100),
          ...Array.from({ length: 7 }, (_, i) => makeCheckout(`ok_${i}`, 'captured', 100)),
        ];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
        const failAlert = res.anomaly_alerts.find((a) => a.type === 'failure_spike');

        expect(failAlert).toBeDefined();
        expect(failAlert?.level).toBe('warning');
        expect(failAlert?.severity).toBe('warning');
        expect(failAlert?.title).toContain('WARNING');
        expect(res.metrics.failure_rate_pct).toBe(30.0);
      });

      it('triggers CRITICAL alert when failure rate is >= 50.0%', () => {
        // 10 checkouts: 5 failed -> 50.0%
        const checkouts = [
          ...Array.from({ length: 5 }, (_, i) => makeCheckout(`f_${i}`, 'failed', 100)),
          ...Array.from({ length: 5 }, (_, i) => makeCheckout(`ok_${i}`, 'captured', 100)),
        ];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
        const failAlert = res.anomaly_alerts.find((a) => a.type === 'failure_spike');

        expect(failAlert).toBeDefined();
        expect(failAlert?.level).toBe('critical');
        expect(failAlert?.severity).toBe('critical');
        expect(failAlert?.title).toContain('CRITICAL');
        expect(res.metrics.failure_rate_pct).toBe(50.0);
      });

      it('correctly calculates total_volume_tnd from captured orders only (excluding failed and pending)', () => {
        const checkouts = [
          makeCheckout('1', 'captured', 150.5),
          makeCheckout('2', 'captured', 249.5),
          makeCheckout('3', 'failed', 500.0), // Should not add to volume
          makeCheckout('4', 'pending', 300.0), // Should not add to volume
        ];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);
        expect(res.metrics.total_volume_tnd).toBe(400.0);
        expect(res.metrics.captured_count).toBe(2);
        expect(res.metrics.failed_count).toBe(1);
      });
    });

    describe('Multi-Anomaly Simultaneous Triggering', () => {
      it('fires Whale + Surge + Critical Failure alerts simultaneously under intense conditions', () => {
        // 35 checkouts total: 20 failed, 15 captured, including a 7,500 TND captured order
        const checkouts: LiveCheckoutItem[] = [
          ...Array.from({ length: 20 }, (_, i) => makeCheckout(`f_${i}`, 'failed', 50)),
          ...Array.from({ length: 14 }, (_, i) => makeCheckout(`ok_${i}`, 'captured', 100)),
          makeCheckout('whale_1', 'captured', 7500.0),
        ];

        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
        expect(res.anomaly_alerts).toHaveLength(3);

        const types = res.anomaly_alerts.map((a) => a.type);
        expect(types).toContain('failure_spike');
        expect(types).toContain('gmv_surge');
        expect(types).toContain('whale_order_detected');
      });
    });
  });

  // =========================================================================
  // Section 4: 24 Tunisia Governorates Address Parsing & Diaspora Telemetry
  // =========================================================================
  describe('4. Tunisia 24-Governorates & Top Diaspora Mapping Heuristics', () => {
    describe('All 24 Tunisia Governorates Meta Constants Verification', () => {
      const EXPECTED_24_GOVS: TunisiaGovernorateCode[] = [
        'TUN', 'ARI', 'BEN', 'MAN', 'NAB', 'ZAG', 'BIZ', 'BEJ',
        'JEN', 'KEF', 'SIL', 'SOU', 'MON', 'MAH', 'SFA', 'KAI',
        'KAS', 'SID', 'GAF', 'TOZ', 'KEB', 'GAB', 'MED', 'TAT',
      ];

      it('contains exactly 24 governorates with complete ISO codes, English, French, Arabic names, and region zone', () => {
        const keys = Object.keys(TUNISIA_GOVERNORATES_META) as TunisiaGovernorateCode[];
        expect(keys).toHaveLength(24);

        for (const gov of EXPECTED_24_GOVS) {
          expect(TUNISIA_GOVERNORATES_META).toHaveProperty(gov);
          const meta = TUNISIA_GOVERNORATES_META[gov];
          expect(meta.iso_code).toMatch(/^TN-\d{2}$/);
          expect(meta.name_en.length).toBeGreaterThan(0);
          expect(meta.name_fr.length).toBeGreaterThan(0);
          expect(meta.name_ar.length).toBeGreaterThan(0);
          expect(meta.region_zone.length).toBeGreaterThan(0);
        }
      });

      it('contains all 11 top diaspora countries with ISO code, name, and flag emoji', () => {
        const expectedDiaspora = ['FR', 'IT', 'DE', 'CA', 'AE', 'QA', 'SA', 'GB', 'US', 'CH', 'BE'];
        for (const c of expectedDiaspora) {
          expect(DIASPORA_COUNTRIES_META).toHaveProperty(c);
          const meta = DIASPORA_COUNTRIES_META[c];
          expect(meta.country_name.length).toBeGreaterThan(0);
          expect(meta.flag_emoji.length).toBeGreaterThan(0);
        }
      });
    });

    describe('Deterministic Postal Code Prefix Routing for all 24 Governorates', () => {
      const postalCodeMap: Array<{ code: string; expected: TunisiaGovernorateCode }> = [
        { code: '1000', expected: 'TUN' },
        { code: '1002', expected: 'TUN' },
        { code: '1080', expected: 'TUN' },
        { code: '2080', expected: 'ARI' },
        { code: '2035', expected: 'ARI' },
        { code: '2058', expected: 'ARI' },
        { code: '2013', expected: 'BEN' },
        { code: '2040', expected: 'BEN' },
        { code: '2033', expected: 'BEN' },
        { code: '2050', expected: 'BEN' },
        { code: '2010', expected: 'MAN' },
        { code: '2011', expected: 'MAN' },
        { code: '2024', expected: 'MAN' },
        { code: '8000', expected: 'NAB' },
        { code: '8050', expected: 'NAB' },
        { code: '1100', expected: 'ZAG' },
        { code: '7000', expected: 'BIZ' },
        { code: '7050', expected: 'BIZ' },
        { code: '9000', expected: 'BEJ' },
        { code: '8100', expected: 'JEN' },
        { code: '8110', expected: 'JEN' },
        { code: '7100', expected: 'KEF' },
        { code: '6100', expected: 'SIL' },
        { code: '4000', expected: 'SOU' },
        { code: '4089', expected: 'SOU' },
        { code: '5000', expected: 'MON' },
        { code: '5080', expected: 'MON' },
        { code: '5100', expected: 'MAH' },
        { code: '5199', expected: 'MAH' },
        { code: '3000', expected: 'SFA' },
        { code: '3020', expected: 'SFA' },
        { code: '3100', expected: 'KAI' },
        { code: '1200', expected: 'KAS' },
        { code: '9100', expected: 'SID' },
        { code: '2100', expected: 'GAF' },
        { code: '2200', expected: 'TOZ' },
        { code: '4200', expected: 'KEB' },
        { code: '6000', expected: 'GAB' },
        { code: '4100', expected: 'MED' },
        { code: '4180', expected: 'MED' },
        { code: '3200', expected: 'TAT' },
      ];

      for (const { code, expected } of postalCodeMap) {
        it(`maps postal code ${code} -> ${expected}`, () => {
          const result = normalizeTunisiaGovernorate({ postal_code: code, country: 'TN' });
          expect(result).toBe(expected);
        });
      }
    });

    describe('Regex City and Delegation Substring Matching across all 24 Governorates', () => {
      const cityTestCases: Array<{ city: string; expected: TunisiaGovernorateCode }> = [
        { city: 'La Marsa', expected: 'TUN' },
        { city: 'Carthage Byrsa', expected: 'TUN' },
        { city: 'Les Berges du Lac 2', expected: 'TUN' },
        { city: 'Sidi Bou Said', expected: 'TUN' },
        { city: 'El Menzah 9', expected: 'TUN' },
        { city: 'La Soukra', expected: 'ARI' },
        { city: 'Ennasr 2', expected: 'ARI' },
        { city: 'Raoued Plage', expected: 'ARI' },
        { city: 'Radès Plage', expected: 'BEN' },
        { city: 'Mégrine Coteaux', expected: 'BEN' },
        { city: 'Megrine Chaker', expected: 'BEN' },
        { city: 'Hammam Lif', expected: 'BEN' },
        { city: 'Ezzahra Ville', expected: 'BEN' },
        { city: 'Oued Ellil', expected: 'MAN' },
        { city: 'Tebourba', expected: 'MAN' },
        { city: 'Denden', expected: 'MAN' },
        { city: 'Hammamet Nord', expected: 'NAB' },
        { city: 'Kélibia', expected: 'NAB' },
        { city: 'Kelibia Plage', expected: 'NAB' },
        { city: 'Korba', expected: 'NAB' },
        { city: 'Grombalia', expected: 'NAB' },
        { city: 'El Fahs', expected: 'ZAG' },
        { city: 'Zaghouan', expected: 'ZAG' },
        { city: 'Menzel Bourguiba', expected: 'BIZ' },
        { city: 'Ras Jebel', expected: 'BIZ' },
        { city: 'Ghar El Melh', expected: 'BIZ' },
        { city: 'Béja Ville', expected: 'BEJ' },
        { city: 'Beja Nord', expected: 'BEJ' },
        { city: 'Medjez El Bab', expected: 'BEJ' },
        { city: 'Testour', expected: 'BEJ' },
        { city: 'Tabarka Port', expected: 'JEN' },
        { city: 'Ain Draham', expected: 'JEN' },
        { city: 'Le Kef', expected: 'KEF' },
        { city: 'Dahmani', expected: 'KEF' },
        { city: 'Makthar', expected: 'SIL' },
        { city: 'Port El Kantaoui', expected: 'SOU' },
        { city: 'Sahloul Sousse', expected: 'SOU' },
        { city: 'Msaken', expected: 'SOU' },
        { city: 'Ksar Hellal', expected: 'MON' },
        { city: 'Moknine', expected: 'MON' },
        { city: 'El Jem Amphitheatre', expected: 'MAH' },
        { city: 'Mahdia Plage', expected: 'MAH' },
        { city: 'Sakiet Ezzit', expected: 'SFA' },
        { city: 'Kerkennah', expected: 'SFA' },
        { city: 'Sbikha', expected: 'KAI' },
        { city: 'Kairouan Medina', expected: 'KAI' },
        { city: 'Sbeitla Ruins', expected: 'KAS' },
        { city: 'Fériana', expected: 'KAS' },
        { city: 'Feriana', expected: 'KAS' },
        { city: 'Regueb', expected: 'SID' },
        { city: 'Sidi Bouzid Centre', expected: 'SID' },
        { city: 'Metlaoui', expected: 'GAF' },
        { city: 'Gafsa Ville', expected: 'GAF' },
        { city: 'Nefta Oasis', expected: 'TOZ' },
        { city: 'Tozeur Palm Grove', expected: 'TOZ' },
        { city: 'Douz Desert Gate', expected: 'KEB' },
        { city: 'Kebili Nord', expected: 'KEB' },
        { city: 'Matmata Berbere', expected: 'GAB' },
        { city: 'Gabes Port', expected: 'GAB' },
        { city: 'Djerba Houmt Souk', expected: 'MED' },
        { city: 'Midoun Djerba', expected: 'MED' },
        { city: 'Zarzis', expected: 'MED' },
        { city: 'Ghomrassen', expected: 'TAT' },
        { city: 'Tataouine Ksar', expected: 'TAT' },
      ];

      for (const { city, expected } of cityTestCases) {
        it(`parses city "${city}" without postal code -> ${expected}`, () => {
          const result = normalizeTunisiaGovernorate({ city, country: 'TN' });
          expect(result).toBe(expected);
        });
      }
    });

    describe('Fallback and Diaspora Routing', () => {
      it('routes international diaspora addresses with non-TN country code to DIASPORA', () => {
        expect(normalizeTunisiaGovernorate({ country: 'FR', city: 'Paris' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'IT', city: 'Milano' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'DE', city: 'Berlin' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'CA', city: 'Montreal' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'AE', city: 'Dubai' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'QA', city: 'Doha' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'SA', city: 'Riyadh' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'GB', city: 'London' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'US', city: 'New York' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'CH', city: 'Geneve' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: 'BE', city: 'Bruxelles' })).toBe('DIASPORA');
      });

      it('falls back to TUN for completely unknown addresses with country TN or no country', () => {
        expect(normalizeTunisiaGovernorate({ city: 'Unknown Street XYZ 999', country: 'TN' })).toBe('TUN');
        expect(normalizeTunisiaGovernorate({})).toBe('TUN');
        expect(
          normalizeTunisiaGovernorate({
            governorate: null,
            state: null,
            city: null,
            postal_code: null,
          }),
        ).toBe('TUN');
      });
    });

    describe('Customer Privacy Masking', () => {
      it('masks customer names properly', () => {
        expect(maskCustomerName('Mohamed Trabelsi')).toBe('M*** T.');
        expect(maskCustomerName('Amira Ben Salah')).toBe('A*** S.');
        expect(maskCustomerName('Foued')).toBe('F***');
        expect(maskCustomerName('', 'ord_abc_1234')).toBe('Guest #1234');
        expect(maskCustomerName(null, 'ord_xyz_9876')).toBe('Guest #9876');
        expect(maskCustomerName(undefined, undefined)).toBe('Guest #4829');
      });
    });

    describe('Adversarial Address String Fuzzing (Whitespace, Case, Accents, Mixed Input)', () => {
      it('handles messy whitespace and casing in address fields', () => {
        expect(normalizeTunisiaGovernorate({ city: '   La   MArSA   ', country: 'tn' })).toBe('TUN');
        expect(normalizeTunisiaGovernorate({ state: '\n\tSOUSSE  Ville\t\n', country: 'TN' })).toBe('SOU');
        expect(normalizeTunisiaGovernorate({ governorate: '  Gafsa  ' })).toBe('GAF');
        expect(normalizeTunisiaGovernorate({ postal_code: '  3000  ' })).toBe('SFA');
      });

      it('prioritizes postal code over mismatched city name if postal code is present', () => {
        // Postal code 4000 (Sousse) with text mentioning Tunis
        expect(normalizeTunisiaGovernorate({ postal_code: '4000', city: 'Avenue Habib Bourguiba Tunis', country: 'TN' })).toBe('SOU');
      });

      it('correctly matches Arabic/transliterated variations and French accents', () => {
        expect(normalizeTunisiaGovernorate({ city: 'Béja', country: 'TN' })).toBe('BEJ');
        expect(normalizeTunisiaGovernorate({ city: 'Beja', country: 'TN' })).toBe('BEJ');
        expect(normalizeTunisiaGovernorate({ city: 'Gabès', country: 'TN' })).toBe('GAB');
        expect(normalizeTunisiaGovernorate({ city: 'Gabes', country: 'TN' })).toBe('GAB');
        expect(normalizeTunisiaGovernorate({ city: 'Kébili', country: 'TN' })).toBe('KEB');
        expect(normalizeTunisiaGovernorate({ city: 'Kebili', country: 'TN' })).toBe('KEB');
        expect(normalizeTunisiaGovernorate({ city: 'Médenine', country: 'TN' })).toBe('MED');
        expect(normalizeTunisiaGovernorate({ city: 'Medenine', country: 'TN' })).toBe('MED');
        expect(normalizeTunisiaGovernorate({ city: 'Radès', country: 'TN' })).toBe('BEN');
        expect(normalizeTunisiaGovernorate({ city: 'Rades', country: 'TN' })).toBe('BEN');
        expect(normalizeTunisiaGovernorate({ city: 'Mégrine', country: 'TN' })).toBe('BEN');
        expect(normalizeTunisiaGovernorate({ city: 'Megrine', country: 'TN' })).toBe('BEN');
        expect(normalizeTunisiaGovernorate({ city: 'Fériana', country: 'TN' })).toBe('KAS');
        expect(normalizeTunisiaGovernorate({ city: 'Feriana', country: 'TN' })).toBe('KAS');
      });
    });
  });
});
