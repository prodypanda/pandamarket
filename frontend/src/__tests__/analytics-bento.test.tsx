import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AnalyticsBentoCockpit,
  AnalyticsData,
  AdsData,
  formatPrice,
  formatCompact,
} from '@/components/dashboard/AnalyticsBentoCockpit';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'dashboardPages.analytics.title': 'Cockpit Analytics & Rentabilité',
        'dashboardPages.analytics.heroSubtitle':
          'Supervisez vos flux de revenus, vélocité produits, heat clock et rentabilité ROAS en temps réel.',
        'dashboardPages.analytics.period7': '7 jours',
        'dashboardPages.analytics.period30': '30 jours',
        'dashboardPages.analytics.period90': '90 jours',
        'dashboardPages.analytics.statusPending': 'En attente',
        'dashboardPages.analytics.statusProcessing': 'En traitement',
        'dashboardPages.analytics.statusPaymentRequired': 'Paiement requis',
        'dashboardPages.analytics.statusFulfilled': 'Expédiée',
        'dashboardPages.analytics.statusDelivered': 'Livrée',
        'dashboardPages.analytics.statusCancelled': 'Annulée',
        'dashboardPages.analytics.statusRefunded': 'Remboursée',
        'dashboardPages.analytics.daySun': 'Dim',
        'dashboardPages.analytics.dayMon': 'Lun',
        'dashboardPages.analytics.dayTue': 'Mar',
        'dashboardPages.analytics.dayWed': 'Mer',
        'dashboardPages.analytics.dayThu': 'Jeu',
        'dashboardPages.analytics.dayFri': 'Ven',
        'dashboardPages.analytics.daySat': 'Sam',
      };
      if (translations[key]) return translations[key];
      if (key === 'dashboardPages.analytics.periodButton') return `${params?.p}j`;
      return '';
    },
    locale: 'fr',
    dir: 'ltr',
  }),
}));

describe('AnalyticsBentoCockpit Component', () => {
  const mockAnalyticsData: AnalyticsData = {
    revenue_trend: [
      { date: '2026-08-05', revenue: 350.5, orders: 4 },
      { date: '2026-08-15', revenue: 620.0, orders: 7 },
      { date: '2026-08-25', revenue: 890.0, orders: 10 },
      { date: '2026-09-03', revenue: 1250.0, orders: 15 },
    ],
    order_breakdown: [
      { status: 'delivered', count: 85 },
      { status: 'processing', count: 25 },
      { status: 'pending', count: 12 },
      { status: 'cancelled', count: 5 },
    ],
    top_products: [
      { id: 'prod_01', title: "Huile d'Olive Extra Vierge 1L", image_url: null, revenue: 4500.0, units_sold: 120 },
      { id: 'prod_02', title: 'Miel de Thym Bio 500g', image_url: null, revenue: 2800.0, units_sold: 70 },
      { id: 'prod_03', title: 'Deglet Nour Premium 1kg', image_url: null, revenue: 1900.0, units_sold: 95 },
      { id: 'prod_04', title: 'Savon Noir Artisanal', image_url: null, revenue: 1100.0, units_sold: 55 },
      { id: 'prod_05', title: 'Epices Harissa Tradition', image_url: null, revenue: 800.0, units_sold: 80 },
    ],
    revenue_by_day: [
      { day: 0, label: 'Dim', revenue: 3500.0, orders: 35 },
      { day: 1, label: 'Lun', revenue: 1800.0, orders: 18 },
      { day: 2, label: 'Mar', revenue: 2100.0, orders: 22 },
      { day: 3, label: 'Mer', revenue: 1950.0, orders: 20 },
      { day: 4, label: 'Jeu', revenue: 2200.0, orders: 24 },
      { day: 5, label: 'Ven', revenue: 2600.0, orders: 28 },
      { day: 6, label: 'Sam', revenue: 3100.0, orders: 32 },
    ],
    kpis: {
      total_revenue: 17250.0,
      total_orders: 179,
      avg_order_value: 96.368,
      repeat_customer_rate: 28.4,
      conversion_period_growth: 14.8,
    },
  };

  const mockAdsData: AdsData = {
    account: {
      balance: '450.000',
      reserved_balance: '50.000',
      total_spend: '850.000',
      active_campaigns: 3,
    },
    analytics: {
      impressions: 45000,
      clicks: 1850,
      ctr: 4.11,
      average_cpc: 0.12,
      conversions: 92,
      revenue: '3200.000',
      roas: 4.25,
    },
    daily: [
      { stat_date: '2026-09-01', impressions: 15000, clicks: 600, conversions: 30, spend: '72.000', revenue: '1050.000' },
      { stat_date: '2026-09-02', impressions: 14000, clicks: 580, conversions: 28, spend: '69.600', revenue: '980.000' },
      { stat_date: '2026-09-03', impressions: 16000, clicks: 670, conversions: 34, spend: '80.400', revenue: '1170.000' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature 1: KPI Cockpit Cards Rendering', () => {
    it('renders all 5 modular KPI cockpit cards with correct values and subtitles', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      // KPI 1: Chiffre d'Affaires
      expect(screen.getByText("Chiffre d'Affaires")).toBeDefined();
      expect(screen.getAllByText('17250.000 TND').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Volume total encaissé')).toBeDefined();

      // KPI 2: Commandes
      expect(screen.getByText('Commandes')).toBeDefined();
      expect(screen.getByText('179')).toBeDefined();
      expect(screen.getByText('Commandes confirmées')).toBeDefined();

      // KPI 3: Panier Moyen (AOV)
      expect(screen.getByText('Panier Moyen (AOV)')).toBeDefined();
      expect(screen.getByText('96.368 TND')).toBeDefined();
      expect(screen.getByText('Moyenne par panier')).toBeDefined();

      // KPI 4: Taux de Réachat
      expect(screen.getByText('Taux de Réachat')).toBeDefined();
      expect(screen.getByText('28.4%')).toBeDefined();
      expect(screen.getByText('Fidélité de la clientèle')).toBeDefined();

      // KPI 5: Croissance Période (positive)
      expect(screen.getByText('Croissance Période')).toBeDefined();
      expect(screen.getByText('+14.8%')).toBeDefined();
      expect(screen.getByText('vs -30j')).toBeDefined();
    });

    it('renders negative conversion period growth appropriately', () => {
      const negativeGrowthData: AnalyticsData = {
        ...mockAnalyticsData,
        kpis: {
          ...mockAnalyticsData.kpis,
          conversion_period_growth: -5.2,
        },
      };

      render(
        <AnalyticsBentoCockpit
          data={negativeGrowthData}
          adsData={mockAdsData}
          period={7}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getByText('-5.2%')).toBeDefined();
      expect(screen.getByText('vs -7j')).toBeDefined();
    });
  });

  describe('Feature 2: Period Switching & Refresh Control', () => {
    it('renders 7, 30, 90 day buttons and fires onPeriodChange on click', () => {
      const onPeriodChange = vi.fn();
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={onPeriodChange}
          loading={false}
        />
      );

      const periodGroup = screen.getByRole('group', { name: 'Sélecteur de période' });
      const btn7 = within(periodGroup).getByRole('button', { name: /7 jours/i });
      const btn30 = within(periodGroup).getByRole('button', { name: /30 jours/i });
      const btn90 = within(periodGroup).getByRole('button', { name: /90 jours/i });

      expect(btn7).toBeDefined();
      expect(btn30).toBeDefined();
      expect(btn90).toBeDefined();

      fireEvent.click(btn7);
      expect(onPeriodChange).toHaveBeenCalledWith(7);

      fireEvent.click(btn90);
      expect(onPeriodChange).toHaveBeenCalledWith(90);
    });

    it('triggers onRefresh callback when actualiser button is clicked', () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
          onRefresh={onRefresh}
        />
      );

      const refreshBtn = screen.getByRole('button', { name: /actualiser/i });
      fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature 3: ROAS vs Net Margin Comparative Widget', () => {
    it('displays Optimal ROAS and positive Net Margin badges when ROAS >= 4.0', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      // Widget title
      expect(screen.getByText('ROAS vs Marge Nette')).toBeDefined();

      // Optimal badge
      expect(screen.getByText('ROAS Optimal')).toBeDefined();
      expect(screen.getByText('Marge Nette Saine')).toBeDefined();

      // ROAS Multiplier
      expect(screen.getByText('4.25×')).toBeDefined();

      // Attributed Revenue: 3200.000 TND; Total Spend: 72 + 69.6 + 80.4 = 222.000 TND; Net margin: 2978.000 TND
      expect(screen.getByText('+2978.000 TND')).toBeDefined();

      // Spend and sales labels
      expect(screen.getByText(/Dépenses Pub: 222.000 TND/i)).toBeDefined();
      expect(screen.getByText(/Ventes: 3200.000 TND/i)).toBeDefined();

      // Optimal recommendation message
      expect(
        screen.getByText(/Excellente efficacité publicitaire ! Augmentez votre budget quotidien/i)
      ).toBeDefined();
    });

    it('displays Profitable ROAS badge when 2.5 <= ROAS < 4.0', () => {
      const profitableAds: AdsData = {
        ...mockAdsData,
        analytics: {
          ...mockAdsData.analytics!,
          revenue: '1500.000',
          roas: 3.1,
        },
        daily: [
          { stat_date: '2026-09-01', impressions: 5000, clicks: 200, conversions: 10, spend: '480.000', revenue: '1500.000' },
        ],
      };

      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={profitableAds}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getByText('ROAS Rentable')).toBeDefined();
      expect(screen.getByText('3.10×')).toBeDefined();
      expect(screen.getByText('Marge Nette Saine')).toBeDefined();
      expect(
        screen.getByText(/Campagnes rentables\. Optimisez les mots-clés/i)
      ).toBeDefined();
    });

    it('displays À Optimiser and Deficit Margin badges when ROAS < 2.5 and margin is negative', () => {
      const deficitAds: AdsData = {
        ...mockAdsData,
        analytics: {
          ...mockAdsData.analytics!,
          clicks: 500,
          average_cpc: 1.0,
          revenue: '300.000',
          roas: 0.6,
        },
        daily: [
          { stat_date: '2026-09-01', impressions: 5000, clicks: 500, conversions: 5, spend: '500.000', revenue: '300.000' },
        ],
      };

      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={deficitAds}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getByText('À Optimiser')).toBeDefined();
      expect(screen.getByText('Marge Déficitaire')).toBeDefined();
      expect(screen.getByText('-200.000 TND')).toBeDefined();
      expect(
        screen.getByText(/Dépenses publicitaires supérieures aux revenus générés/i)
      ).toBeDefined();
    });

    it('displays En attente and Marge Neutre badges when no ads data is provided', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={null}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getAllByText('En attente').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Marge Neutre')).toBeDefined();
      expect(screen.getByText('0.00×')).toBeDefined();
      expect(
        screen.getByText(/Activez une campagne PandaAds ciblée sur vos articles phares/i)
      ).toBeDefined();
    });
  });

  describe('Feature 4: Peak Sales Heat Clock & Top Product Performance Ring', () => {
    it('renders 7-Day heat clock with daily breakdown and highlights the best day', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getByText('Cadran des Ventes')).toBeDefined();
      expect(screen.getByText('Distribution des commandes par jour de la semaine')).toBeDefined();

      // Best day: Sunday (3500.000 TND)
      expect(screen.getByText(/Meilleur jour de vente :/i)).toBeDefined();
      expect(screen.getAllByText(/3500.000 TND/i).length).toBeGreaterThanOrEqual(1);
    });

    it('switches heat clock to 24-hour mode and renders circular clock face with peaks', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      const btn24h = screen.getByRole('button', { name: /24 heures/i });
      fireEvent.click(btn24h);

      expect(screen.getByText("Horaires d'affluence & pics d'achats sur la journée")).toBeDefined();
      expect(screen.getByText('Pic Optimal')).toBeDefined();
      expect(screen.getByText('20h - 23h')).toBeDefined();
      expect(screen.getByText('Soirée Mobile')).toBeDefined();
      expect(screen.getByText(/12h-14h Déjeuner/i)).toBeDefined();
    });

    it('renders Top Product Performance Ring with concentration calculation and ranked stream', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getByText('Anneau de Performance Produits & Concentration CA')).toBeDefined();

      // Top products sum: 4500 + 2800 + 1900 + 1100 + 800 = 11100 TND
      // Total catalog revenue = 17250 TND
      // Concentration = (11100 / 17250) * 100 = 64.3% -> Math.round is 64%
      expect(screen.getByText('Concentration')).toBeDefined();
      expect(screen.getByText('64%')).toBeDefined();
      expect(screen.getByText('Top 5 Articles')).toBeDefined();
      expect(screen.getByText('11100.000 TND')).toBeDefined();

      // Ranked stream products
      expect(screen.getByText("Huile d'Olive Extra Vierge 1L")).toBeDefined();
      expect(screen.getByText('Miel de Thym Bio 500g')).toBeDefined();
      expect(screen.getByText('Deglet Nour Premium 1kg')).toBeDefined();
      expect(screen.getByText('Savon Noir Artisanal')).toBeDefined();
      expect(screen.getByText('Epices Harissa Tradition')).toBeDefined();

      // Units sold and revenue
      expect(screen.getByText(/120 vendus/i)).toBeDefined();
      expect(screen.getByText('4500.000 TND')).toBeDefined();
    });
  });

  describe('Feature 5: 1-Click PandaAds Launcher Shortcuts', () => {
    it('renders 1-click PandaAds booster buttons for each ranked product with product_id query', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      // Check product booster links
      const boosterLinks = screen.getAllByRole('link', { name: /booster/i });
      expect(boosterLinks.length).toBe(5);

      // Verify link destination contains product_id
      expect(boosterLinks[0].getAttribute('href')).toBe('/hub/dashboard/ads?product_id=prod_01');
      expect(boosterLinks[1].getAttribute('href')).toBe('/hub/dashboard/ads?product_id=prod_02');
      expect(boosterLinks[0].getAttribute('title')).toBe('Booster "Huile d\'Olive Extra Vierge 1L" avec PandaAds');
    });

    it('renders global PandaAds shortcut actions and triggers onCreateCampaign callback if provided', () => {
      const onCreateCampaign = vi.fn();
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
          onCreateCampaign={onCreateCampaign}
        />
      );

      const createBtn = screen.getByRole('button', { name: /créer une campagne pandaads/i });
      fireEvent.click(createBtn);
      expect(onCreateCampaign).toHaveBeenCalledTimes(1);
    });

    it('renders link to ads page for management when onCreateCampaign is not provided', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      const manageLink = screen.getByRole('link', { name: /gérer les campagnes pandaads/i });
      expect(manageLink.getAttribute('href')).toBe('/hub/dashboard/ads');
    });
  });

  describe('Feature 6: Loading & Empty States', () => {
    it('displays loading placeholders "—" on KPI cards when loading is true', () => {
      render(
        <AnalyticsBentoCockpit
          data={mockAnalyticsData}
          adsData={mockAdsData}
          period={30}
          onPeriodChange={vi.fn()}
          loading={true}
        />
      );

      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(5);
    });

    it('renders empty fallback states gracefully when data is null', () => {
      render(
        <AnalyticsBentoCockpit
          data={null}
          adsData={null}
          period={30}
          onPeriodChange={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getByText('Aucune donnée de vente enregistrée sur cette période')).toBeDefined();
      expect(screen.getByText('Aucune donnée hebdomadaire')).toBeDefined();
      expect(screen.getByText('Aucun article vendu sur la période sélectionnée')).toBeDefined();
    });
  });

  describe('Helpers: formatPrice and formatCompact', () => {
    it('formats price in TND with 3 decimal places', () => {
      expect(formatPrice(10)).toBe('10.000 TND');
      expect(formatPrice(12.3456)).toBe('12.346 TND');
      expect(formatPrice(0)).toBe('0.000 TND');
    });

    it('formats numbers compactly', () => {
      expect(formatCompact(500)).toBe('500');
      expect(formatCompact(1500)).toBe('1.5K');
      expect(formatCompact(12000)).toBe('12.0K');
    });
  });
});
