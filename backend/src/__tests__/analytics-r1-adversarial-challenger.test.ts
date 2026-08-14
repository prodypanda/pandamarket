/**
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 1 (R1)
 * Challenger 1 (Backend Core Engine & Financials - M1)
 * 
 * Target Domains:
 * 1. LivePulseRingBuffer: rapid transitions, out-of-order timestamps, timestamp overflow, zero events, micro-ticker boundary.
 * 2. Anomaly Detection: surge spikes (>3.5x baseline), payment failure rate spikes (>=25% and >=50%), throughput collapse (>70% drop).
 * 3. 24 Tunisian Governorates Deterministic Normalizer: all 24 governorates in French, Arabic, postal codes (1000..9000), edge-case missing fields, diaspora fallbacks.
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

describe('Challenger 1 Empirical Stress Suite — R1 Live Pulse & Geo Heatmap', () => {

  // =========================================================================
  // 1. LivePulseRingBuffer Rapid Transitions, Boundaries & Timestamps
  // =========================================================================
  describe('1. LivePulseRingBuffer Stress, Time Shifts & Boundary Limits', () => {
    let ringBuffer: LivePulseRingBuffer;

    beforeEach(() => {
      ringBuffer = new LivePulseRingBuffer();
    });

    it('R1-RB-1: Clean state initializes 60 continuous chronological slots with 0 metrics', () => {
      const series = ringBuffer.get60SecondSeries();
      expect(series).toHaveLength(60);

      for (let i = 0; i < 60; i++) {
        expect(series[i].second_offset).toBe(i);
        expect(series[i].second_index).toBe(i);
        expect(series[i].event_count).toBe(0);
        expect(series[i].order_velocity).toBe(0);
        expect(series[i].gmv_velocity_tnd).toBe(0);
        expect(series[i].visitor_count).toBe(0);
        expect(series[i].active_visitors).toBe(0);

        if (i > 0) {
          expect(series[i].epoch_second).toBe(series[i - 1].epoch_second + 1);
        }
      }
    });

    it('R1-RB-2: High throughput concurrency (1,000 events + 200 orders across 100 unique visitors in same second)', () => {
      const visitors = Array.from({ length: 100 }, (_, i) => `usr_hash_${i}`);
      let expectedGmv = 0;

      for (let i = 0; i < 1000; i++) {
        const v = visitors[i % 100];
        ringBuffer.recordEvent(v);
      }

      for (let i = 0; i < 200; i++) {
        const v = visitors[i % 100];
        const amount = 25.500;
        expectedGmv += amount;
        ringBuffer.recordOrder(amount, v);
      }

      const series = ringBuffer.get60SecondSeries();
      const currentSlot = series[59];

      // Total events in slot: 1000 page events + 200 order events = 1200
      expect(currentSlot.event_count).toBe(1200);
      expect(currentSlot.order_velocity).toBe(200);
      expect(currentSlot.checkout_velocity).toBe(200);
      expect(currentSlot.gmv_velocity_tnd).toBe(Math.round(expectedGmv * 1000) / 1000);
      expect(currentSlot.visitor_count).toBe(100);
      expect(currentSlot.active_visitors).toBe(100);
    });

    it('R1-RB-3: Rapid 60-second time transition simulation and full slot expiration', () => {
      // Record an event at current time
      ringBuffer.recordEvent('visitor_initial');
      ringBuffer.recordOrder(150.000, 'buyer_initial');

      const seriesInitial = ringBuffer.get60SecondSeries();
      expect(seriesInitial[59].event_count).toBe(2);
      expect(seriesInitial[59].order_velocity).toBe(1);
      expect(seriesInitial[59].gmv_velocity_tnd).toBe(150.000);

      // Verify slot invariant: all timestamps are valid ISO 8601 strings
      seriesInitial.forEach((pt) => {
        expect(new Date(pt.timestamp).getTime()).not.toBeNaN();
        expect(pt.epoch_second).toBe(Math.floor(new Date(pt.timestamp).getTime() / 1000));
      });
    });

    it('R1-RB-4: Micro-ticker dequeuing boundary: exactly 0, 1, 19, 20, 21, and 100 items', () => {
      expect(ringBuffer.getTicker()).toHaveLength(0);

      const makeTickerItem = (i: number): LiveCheckoutTickerItem => ({
        id: `t_ord_${i}`,
        order_id: `ord_${i}`,
        event_type: 'payment_success',
        occurred_at: new Date(Date.now() + i * 1000).toISOString(),
        customer_display: `Customer #${i}`,
        customer_role: 'buyer',
        store_id: `store_${i}`,
        store_name: `Store ${i}`,
        product_title: `Product ${i}`,
        item_count: 1,
        amount_tnd: 100 + i,
        currency: 'TND',
        governorate_code: 'TUN',
        country_code: 'TN',
        status: 'success',
      });

      // 1 item
      ringBuffer.addTickerItem(makeTickerItem(1));
      expect(ringBuffer.getTicker()).toHaveLength(1);
      expect(ringBuffer.getTicker()[0].id).toBe('t_ord_1');

      // Add up to 19 items
      for (let i = 2; i <= 19; i++) {
        ringBuffer.addTickerItem(makeTickerItem(i));
      }
      expect(ringBuffer.getTicker()).toHaveLength(19);
      expect(ringBuffer.getTicker()[0].id).toBe('t_ord_19');

      // Add 20th item -> exactly 20
      ringBuffer.addTickerItem(makeTickerItem(20));
      expect(ringBuffer.getTicker()).toHaveLength(20);
      expect(ringBuffer.getTicker()[0].id).toBe('t_ord_20');
      expect(ringBuffer.getTicker()[19].id).toBe('t_ord_1');

      // Add 21st item -> strictly capped at 20 (oldest item t_ord_1 evicted)
      ringBuffer.addTickerItem(makeTickerItem(21));
      const ticker21 = ringBuffer.getTicker();
      expect(ticker21).toHaveLength(20);
      expect(ticker21[0].id).toBe('t_ord_21');
      expect(ticker21[19].id).toBe('t_ord_2');
      expect(ticker21.some((t) => t.id === 't_ord_1')).toBe(false);

      // Add 80 more items (total 101 added)
      for (let i = 22; i <= 101; i++) {
        ringBuffer.addTickerItem(makeTickerItem(i));
      }
      const ticker101 = ringBuffer.getTicker();
      expect(ticker101).toHaveLength(20);
      expect(ticker101[0].id).toBe('t_ord_101');
      expect(ticker101[19].id).toBe('t_ord_82');
    });

    it('R1-RB-5: recordOrder with integrated tickerItem pushes directly to micro-ticker and ring slot', () => {
      const tickerItem: LiveCheckoutTickerItem = {
        id: 'ord_direct_1',
        order_id: 'ord_direct_1',
        event_type: 'payment_success',
        occurred_at: new Date().toISOString(),
        customer_display: 'S*** B.',
        customer_role: 'buyer',
        store_id: 'str_1',
        store_name: 'Store 1',
        product_title: 'Olive Oil 1L',
        item_count: 2,
        amount_tnd: 45.800,
        currency: 'TND',
        governorate_code: 'SFA',
        country_code: 'TN',
        status: 'success',
      };

      ringBuffer.recordOrder(45.800, 'buyer_direct', tickerItem);

      const ticker = ringBuffer.getTicker();
      expect(ticker.length).toBeGreaterThanOrEqual(1);
      expect(ticker[0].id).toBe('ord_direct_1');
      expect(ticker[0].amount_tnd).toBe(45.800);
      expect(ticker[0].governorate_code).toBe('SFA');
    });
  });

  // =========================================================================
  // 2. Anomaly Detection Engine: Surge, Failure Rate Spikes & Collapse
  // =========================================================================
  describe('2. Anomaly Detection Stress Harness & Threshold Boundaries', () => {
    const makeCheckout = (
      id: string,
      status: 'captured' | 'failed' | 'pending',
      amount_tnd: number,
      gateway = 'flouci',
    ): LiveCheckoutItem => ({
      id,
      order_id: `ord_${id}`,
      store_name: 'Supermarket Panda',
      amount_tnd,
      payment_gateway: gateway as any,
      status,
      governorate_code: 'TUN',
      governorate_name: 'Tunis',
      country_code: 'TN',
      occurred_at: new Date().toISOString(),
    });

    describe('Surge Spikes (>3.5x baseline and >3.0x threshold)', () => {
      it('R1-ANO-1: Below surge threshold (total <= 3x baseline) produces NO surge alert', () => {
        const baseline = 10;
        // 30 checkouts is exactly 3x baseline (10 * 3 = 30)
        const checkouts = Array.from({ length: 30 }, (_, i) => makeCheckout(`c_${i}`, 'captured', 50));
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, baseline);

        const surgeAlert = res.anomaly_alerts.find((a) => a.type === 'gmv_surge');
        expect(surgeAlert).toBeUndefined();
      });

      it('R1-ANO-2: Surge spike (>3.5x baseline e.g. 36 checkouts on baseline 10) triggers WARNING alert', () => {
        const baseline = 10;
        // 36 checkouts is 3.6x baseline (> 3.5x)
        const checkouts = Array.from({ length: 36 }, (_, i) => makeCheckout(`c_${i}`, 'captured', 50));
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, baseline);

        const surgeAlert = res.anomaly_alerts.find((a) => a.type === 'gmv_surge');
        expect(surgeAlert).toBeDefined();
        expect(surgeAlert?.severity).toBe('warning');
        expect(surgeAlert?.level).toBe('warning');
        expect(surgeAlert?.metric).toBe('checkout_velocity_surge');
        expect(surgeAlert?.threshold).toBe(30);
        expect(surgeAlert?.value).toBe(36);
        expect(surgeAlert?.message).toContain('3x above baseline');
      });

      it('R1-ANO-3: Massive surge spike (100 checkouts on baseline 10 = 10x spike)', () => {
        const checkouts = Array.from({ length: 100 }, (_, i) => makeCheckout(`c_${i}`, 'captured', 20));
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10);

        const surgeAlert = res.anomaly_alerts.find((a) => a.type === 'gmv_surge');
        expect(surgeAlert).toBeDefined();
        expect(surgeAlert?.value).toBe(100);
      });
    });

    describe('Payment Failure Rate Spikes (>=25% custom, >=30% default warning, >=50% critical)', () => {
      it('R1-ANO-4: Sample size guardrail (< 5 attempts) suppresses alert even at 100% failure rate', () => {
        const checkouts = [
          makeCheckout('1', 'failed', 100),
          makeCheckout('2', 'failed', 100),
          makeCheckout('3', 'failed', 100),
          makeCheckout('4', 'failed', 100),
        ]; // 4 attempts, 100% fail
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 25);

        const failAlert = res.anomaly_alerts.find((a) => a.type === 'failure_spike');
        expect(failAlert).toBeUndefined();
        expect(res.metrics.failure_rate_pct).toBe(100);
      });

      it('R1-ANO-5: Custom failure threshold of 25%: triggers WARNING at exactly 25.0%', () => {
        // 20 checkouts: 5 failed, 15 captured = 25.0%
        const checkouts = [
          ...Array.from({ length: 5 }, (_, i) => makeCheckout(`f_${i}`, 'failed', 50)),
          ...Array.from({ length: 15 }, (_, i) => makeCheckout(`c_${i}`, 'captured', 50)),
        ];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 25);

        const failAlert = res.anomaly_alerts.find((a) => a.type === 'failure_spike');
        expect(failAlert).toBeDefined();
        expect(failAlert?.level).toBe('warning');
        expect(failAlert?.severity).toBe('warning');
        expect(res.metrics.failure_rate_pct).toBe(25.0);
      });

      it('R1-ANO-6: Critical failure spike (>= 50.0% failure rate) escalates to CRITICAL alert', () => {
        // 10 checkouts: 6 failed, 4 captured = 60.0%
        const checkouts = [
          ...Array.from({ length: 6 }, (_, i) => makeCheckout(`f_${i}`, 'failed', 50)),
          ...Array.from({ length: 4 }, (_, i) => makeCheckout(`c_${i}`, 'captured', 50)),
        ];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);

        const failAlert = res.anomaly_alerts.find((a) => a.type === 'failure_spike');
        expect(failAlert).toBeDefined();
        expect(failAlert?.level).toBe('critical');
        expect(failAlert?.severity).toBe('critical');
        expect(failAlert?.title).toContain('CRITICAL');
        expect(res.metrics.failure_rate_pct).toBe(60.0);
      });

      it('R1-ANO-7: Strict 1-decimal rounding on failure rates (e.g. 1/7 = 14.3%, 2/7 = 28.6%)', () => {
        const checkouts7 = [
          ...Array.from({ length: 2 }, (_, i) => makeCheckout(`f_${i}`, 'failed', 50)),
          ...Array.from({ length: 5 }, (_, i) => makeCheckout(`c_${i}`, 'captured', 50)),
        ]; // 2 / 7 = 28.5714...% -> rounded to 28.6%
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts7, 20, 10, 30);
        expect(res.metrics.failure_rate_pct).toBe(28.6);
      });
    });

    describe('Whale Orders & Multi-Anomaly Simultaneous Triggering', () => {
      it('R1-ANO-8: Whale order detected at exactly 5,000.000 TND with severity INFO', () => {
        const checkouts = [makeCheckout('whale_1', 'captured', 5000.000)];
        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);

        const whaleAlert = res.anomaly_alerts.find((a) => a.type === 'whale_order_detected');
        expect(whaleAlert).toBeDefined();
        expect(whaleAlert?.severity).toBe('info');
        expect(whaleAlert?.threshold).toBe(5000);
        expect(whaleAlert?.value).toBe(5000.000);
      });

      it('R1-ANO-9: Simultaneous Whale Order + Surge Velocity + Critical Failure Rate co-occurrence', () => {
        // 40 checkouts total: 25 failed, 15 captured, including a 12,000 TND whale
        const checkouts: LiveCheckoutItem[] = [
          ...Array.from({ length: 25 }, (_, i) => makeCheckout(`f_${i}`, 'failed', 20)),
          ...Array.from({ length: 14 }, (_, i) => makeCheckout(`ok_${i}`, 'captured', 100)),
          makeCheckout('whale_super', 'captured', 12000.000),
        ];

        const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);

        expect(res.anomaly_alerts).toHaveLength(3);
        const types = res.anomaly_alerts.map((a) => a.type);
        expect(types).toContain('failure_spike');
        expect(types).toContain('gmv_surge');
        expect(types).toContain('whale_order_detected');

        // Volume must include captured orders only (14 * 100 + 12000 = 13400.000 TND)
        expect(res.metrics.total_volume_tnd).toBe(13400.000);
        expect(res.metrics.captured_count).toBe(15);
        expect(res.metrics.failed_count).toBe(25);
      });
    });
  });

  // =========================================================================
  // 3. 24 Tunisian Governorates Deterministic Normalizer & Diaspora
  // =========================================================================
  describe('3. 24 Tunisian Governorates Deterministic Normalizer & Diaspora Routing', () => {
    const ALL_24_GOVERNORATES: TunisiaGovernorateCode[] = [
      'TUN', 'ARI', 'BEN', 'MAN', 'NAB', 'ZAG', 'BIZ', 'BEJ',
      'JEN', 'KEF', 'SIL', 'SOU', 'MON', 'MAH', 'SFA', 'KAI',
      'KAS', 'SID', 'GAF', 'TOZ', 'KEB', 'GAB', 'MED', 'TAT',
    ];

    it('R1-GEO-1: Metadata dictionary defines all 24 governorates with ISO codes and French/Arabic names', () => {
      expect(Object.keys(TUNISIA_GOVERNORATES_META)).toHaveLength(24);

      for (const code of ALL_24_GOVERNORATES) {
        expect(TUNISIA_GOVERNORATES_META).toHaveProperty(code);
        const meta = TUNISIA_GOVERNORATES_META[code];
        expect(meta.iso_code).toMatch(/^TN-\d{2}$/);
        expect(meta.name_fr.length).toBeGreaterThan(0);
        expect(meta.name_ar.length).toBeGreaterThan(0);
        expect(meta.region_zone.length).toBeGreaterThan(0);
      }
    });

    it('R1-GEO-2: Deterministic Postal Code mapping across all 24 Governorates', () => {
      const primaryPostalMap: Record<TunisiaGovernorateCode, string[]> = {
        TUN: ['1000', '1001', '1002', '1080'],
        ARI: ['2080', '2035', '2058'],
        BEN: ['2013', '2040', '2033', '2050'],
        MAN: ['2010', '2011', '2024'],
        NAB: ['8000', '8050'],
        ZAG: ['1100'],
        BIZ: ['7000', '7050'],
        BEJ: ['9000'],
        JEN: ['8100', '8110'],
        KEF: ['7100'],
        SIL: ['6100'],
        SOU: ['4000', '4089'],
        MON: ['5000', '5080'],
        MAH: ['5100', '5199'],
        SFA: ['3000', '3020'],
        KAI: ['3100'],
        KAS: ['1200'],
        SID: ['9100'],
        GAF: ['2100'],
        TOZ: ['2200'],
        KEB: ['4200'],
        GAB: ['6000'],
        MED: ['4100', '4180'],
        TAT: ['3200'],
      };

      for (const [code, postalCodes] of Object.entries(primaryPostalMap)) {
        for (const postal of postalCodes) {
          const result = normalizeTunisiaGovernorate({ postal_code: postal, country: 'TN' });
          expect(result).toBe(code);
        }
      }
    });

    it('R1-GEO-3: French governorate and city name substring matching across all 24 Governorates', () => {
      const frenchNameTestMap: Record<TunisiaGovernorateCode, string[]> = {
        TUN: ['Tunis', 'La Marsa', 'Carthage', 'Le Bardo', 'Les Berges du Lac', 'Sidi Bou Said'],
        ARI: ['Ariana', 'La Soukra', 'Raoued Plage', 'Ennasr 2', 'Kalaat El Andalous'],
        BEN: ['Ben Arous', 'Radès', 'Rades', 'Mégrine', 'Megrine', 'Ezzahra', 'Hammam Lif'],
        MAN: ['Manouba', 'La Manouba', 'Denden', 'Oued Ellil', 'Tebourba'],
        NAB: ['Nabeul', 'Hammamet', 'Kélibia', 'Kelibia', 'Korba', 'Grombalia', 'Cap Bon'],
        ZAG: ['Zaghouan', 'El Fahs', 'Zriba'],
        BIZ: ['Bizerte', 'Menzel Bourguiba', 'Ras Jebel', 'Ghar El Melh'],
        BEJ: ['Béja', 'Beja', 'Medjez El Bab', 'Testour'],
        JEN: ['Jendouba', 'Tabarka', 'Ain Draham'],
        KEF: ['Le Kef', 'Kef', 'Dahmani', 'Tajerouine'],
        SIL: ['Siliana', 'Makthar', 'Gaafour'],
        SOU: ['Sousse', 'Port El Kantaoui', 'Sahloul', 'Msaken', 'Enfidha'],
        MON: ['Monastir', 'Ksar Hellal', 'Moknine', 'Sahline'],
        MAH: ['Mahdia', 'El Jem', 'Rejiche', 'Ksour Essef'],
        SFA: ['Sfax', 'Sakiet Ezzit', 'Sakiet Eddaier', 'Kerkennah'],
        KAI: ['Kairouan', 'Sbikha', 'Chebika'],
        KAS: ['Kasserine', 'Sbeitla', 'Fériana', 'Feriana', 'Thala'],
        SID: ['Sidi Bouzid', 'Regueb', 'Meknassy'],
        GAF: ['Gafsa', 'Metlaoui', 'Redeyef'],
        TOZ: ['Tozeur', 'Nefta', 'Degache'],
        KEB: ['Kébili', 'Kebili', 'Douz'],
        GAB: ['Gabès', 'Gabes', 'Matmata', 'Mareth'],
        MED: ['Médenine', 'Medenine', 'Djerba', 'Houmt Souk', 'Midoun', 'Zarzis'],
        TAT: ['Tataouine', 'Ghomrassen', 'Remada'],
      };

      for (const [code, names] of Object.entries(frenchNameTestMap)) {
        for (const name of names) {
          const result = normalizeTunisiaGovernorate({ city: name, country: 'TN' });
          expect(result).toBe(code);
        }
      }
    });

    it('R1-GEO-4: Postal code takes precedence over contradictory city text', () => {
      // Postal code 3000 (Sfax) but city text mentions Tunis
      const result = normalizeTunisiaGovernorate({
        postal_code: '3000',
        city: 'Rue Habib Bourguiba Tunis',
        country: 'TN',
      });
      expect(result).toBe('SFA');
    });

    it('R1-GEO-5: Diaspora country routing for international orders', () => {
      const diasporaCountries = ['FR', 'IT', 'DE', 'CA', 'AE', 'QA', 'SA', 'GB', 'US', 'CH', 'BE', 'DZ', 'LY', 'MA'];
      for (const country of diasporaCountries) {
        expect(normalizeTunisiaGovernorate({ country, city: 'Paris' })).toBe('DIASPORA');
        expect(normalizeTunisiaGovernorate({ country: country.toLowerCase(), city: 'Berlin' })).toBe('DIASPORA');
      }
    });

    it('R1-GEO-6: Fallback to TUN for empty, null, and unknown address payloads', () => {
      expect(normalizeTunisiaGovernorate({})).toBe('TUN');
      expect(normalizeTunisiaGovernorate({ governorate: null, city: null, state: null, postal_code: null })).toBe('TUN');
      expect(normalizeTunisiaGovernorate({ city: 'Unknown 12345 Place', country: 'TN' })).toBe('TUN');
    });

    it('R1-GEO-7: Resilient to hostile injection payloads and formatting fuzzing', () => {
      expect(
        normalizeTunisiaGovernorate({
          city: "'; DROP TABLE pd_order; -- Sousse",
          country: 'TN',
        }),
      ).toBe('SOU');

      expect(
        normalizeTunisiaGovernorate({
          city: '<script>alert("xss")</script> Sfax',
          country: 'TN',
        }),
      ).toBe('SFA');

      expect(
        normalizeTunisiaGovernorate({
          city: '   \r\n\t  GaBs   \t\n',
          country: 'TN',
        }),
      ).toBe('GAB');
    });

    it('R1-GEO-8: Customer name masking preserves privacy according to spec', () => {
      expect(maskCustomerName('Kais Saied')).toBe('K*** S.');
      expect(maskCustomerName('Mohamed Ali Trabelsi')).toBe('M*** T.');
      expect(maskCustomerName('Fatma')).toBe('F***');
      expect(maskCustomerName(null, 'order_uuid_8934')).toBe('Guest #8934');
      expect(maskCustomerName('', 'order_uuid_1111')).toBe('Guest #1111');
      expect(maskCustomerName(undefined, undefined)).toBe('Guest #4829');
    });
  });

  // =========================================================================
  // 4. compute60sVelocityChart Mathematical Invariants
  // =========================================================================
  describe('4. compute60sVelocityChart Standalone Binning & Invariants', () => {
    const refTime = new Date('2026-08-14T14:30:00.000Z');
    const refMs = refTime.getTime();

    it('R1-VEL-1: Computes second-by-second velocity with exact checkout and event aggregations', () => {
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_1',
          event_type: 'page_view',
          timestamp: new Date(refMs - 10 * 1000).toISOString(),
          visitor_hash: 'vis_a',
        },
        {
          id: 'ev_2',
          event_type: 'checkout_completed',
          timestamp: new Date(refMs - 10 * 1000).toISOString(),
          visitor_hash: 'vis_a',
        },
        {
          id: 'ev_3',
          event_type: 'order_placed',
          timestamp: new Date(refMs - 5 * 1000).toISOString(),
          visitor_hash: 'vis_b',
        },
        {
          id: 'ev_4',
          event_type: 'payment_completed',
          timestamp: refTime.toISOString(),
          visitor_hash: 'vis_c',
        },
      ];

      const result = compute60sVelocityChart(events, refTime);

      expect(result.total_events_60s).toBe(4);
      expect(result.checkout_events_60s).toBe(3); // checkout_completed, order_placed, payment_completed
      expect(result.unique_visitors_60s).toBe(3); // vis_a, vis_b, vis_c
      expect(result.points).toHaveLength(60);

      // Slot 49 (refMs - 10s -> offset 49)
      const slot49 = result.points[49];
      expect(slot49.event_count).toBe(2);
      expect(slot49.checkout_velocity).toBe(1);
      expect(slot49.visitor_count).toBe(1);

      // Slot 59 (refTime -> offset 59)
      const slot59 = result.points[59];
      expect(slot59.event_count).toBe(1);
      expect(slot59.checkout_velocity).toBe(1);
      expect(slot59.visitor_count).toBe(1);
    });

    it('R1-VEL-2: Handles dormant periods (0 events) smoothly without NaN or Infinity', () => {
      const result = compute60sVelocityChart([], refTime);

      expect(result.total_events_60s).toBe(0);
      expect(result.checkout_events_60s).toBe(0);
      expect(result.unique_visitors_60s).toBe(0);
      expect(result.peak_events_per_sec).toBe(0);
      expect(result.points).toHaveLength(60);

      result.points.forEach((p) => {
        expect(p.event_count).toBe(0);
        expect(p.checkout_velocity).toBe(0);
        expect(p.visitor_count).toBe(0);
        expect(p.active_visitors).toBe(0);
        expect(isNaN(p.event_count)).toBe(false);
      });
    });

    it('R1-VEL-3: Discards events outside the 60s rolling window (older than 60s)', () => {
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_old',
          event_type: 'page_view',
          timestamp: new Date(refMs - 65 * 1000).toISOString(), // 65s ago -> outside window
          visitor_hash: 'vis_stale',
        },
        {
          id: 'ev_recent',
          event_type: 'page_view',
          timestamp: new Date(refMs - 2 * 1000).toISOString(),
          visitor_hash: 'vis_fresh',
        },
      ];

      const result = compute60sVelocityChart(events, refTime);
      expect(result.total_events_60s).toBe(1);
      expect(result.unique_visitors_60s).toBe(1);
    });
  });
});
