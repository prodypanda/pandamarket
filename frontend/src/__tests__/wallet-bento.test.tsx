import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletBentoCockpit } from '@/components/dashboard/WalletBentoCockpit';
import { computeTunisianRibKey } from '@/lib/tunisia-banking';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'fr',
    dir: 'ltr',
  }),
}));

describe('WalletBentoCockpit Component', () => {
  // Compute valid test RIBs using authentic tunisia-banking algorithm
  const stbBase18 = '100011234567890123';
  const stbKey = computeTunisianRibKey(stbBase18);
  const validStbRib = `${stbBase18}${stbKey}`; // 10 001 1234567890123 68

  const biatBase18 = '080251234567890123';
  const biatKey = computeTunisianRibKey(biatBase18);
  const validBiatRib = `${biatBase18}${biatKey}`; // 08 025 1234567890123 ..

  const mockWallet = {
    balance: 1450.5,
    pending_balance: 550.25,
    total_earned: 8900.0,
    total_withdrawn: 6900.0,
    payout_mode: 'on_demand' as const,
    retention_days: 7,
    currency: 'TND',
  };

  const mockTransactions = [
    {
      id: 'tx_01',
      type: 'order_revenue',
      amount: 128.5,
      status: 'completed',
      reference: 'ORD-2026-9901',
      description: 'Encaissement Aramex',
      created_at: '2026-09-02T14:30:00Z',
    },
    {
      id: 'tx_02',
      type: 'withdrawal',
      amount: -500.0,
      status: 'completed',
      reference: 'SIBTEL-VIR-8821',
      description: 'Virement STB',
      created_at: '2026-09-01T09:15:00Z',
    },
    {
      id: 'tx_03',
      type: 'order_revenue',
      amount: 85.0,
      status: 'pending',
      reference: 'ORD-2026-9902',
      description: 'Colis en cours de livraison',
      created_at: '2026-09-03T10:00:00Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Feature 1: Cash Flow Velocity Cards with Progress Rings', () => {
    it('renders wallet cockpit header and SIBTEL badge', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      expect(screen.getByText('Bento Cockpit Portefeuille')).toBeDefined();
      expect(screen.getByText('SIBTEL Connect')).toBeDefined();
      expect(screen.getByText('Cockpit Financier & Trésorerie')).toBeDefined();
    });

    it('renders balance metrics, pending COD funds, and total capital', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      // Available balance
      expect(screen.getByText('1450.500 TND')).toBeDefined();
      // Pending COD escrow
      expect(screen.getByText('550.250 TND')).toBeDefined();
      // Total earned
      expect(screen.getByText('8900.000 TND')).toBeDefined();
      // Total withdrawn
      expect(screen.getByText('6900.000 TND')).toBeDefined();
    });

    it('renders dual concentric progress ring calculations and labels', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      // Total funds is 1450.5 + 550.25 = 2000.75 TND
      expect(screen.getByText('Total : 2000.750 TND')).toBeDefined();
      // Available ratio is ~72%
      expect(screen.getByText(/Dispo \(72%\)/)).toBeDefined();
      // Pending ratio is ~28%
      expect(screen.getByText(/COD \(28%\)/)).toBeDefined();
    });

    it('supports RTL layout correctly', () => {
      const { container } = render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
          dir="rtl"
        />
      );

      const root = container.firstElementChild;
      expect(root?.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('Feature 2: Instant Payout Launcher with 20-digit RIB & Bank Detection', () => {
    it('formats RIB automatically and displays live bank detection badge for STB', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      const ribInput = screen.getByPlaceholderText(/08 000 0000000000000 18/i);
      fireEvent.change(ribInput, { target: { value: validStbRib } });

      // Formatted with spaces
      expect(ribInput).toHaveProperty('value', `10 001 1234567890123 ${stbKey}`);

      // Bank detection badge for STB
      expect(screen.getByText('STB')).toBeDefined();
      expect(screen.getByText(/Société Tunisienne de Banque/i)).toBeDefined();
      expect(screen.getByText(/الشركة التونسية للبنك/)).toBeDefined();
      expect(screen.getByText(/BIC: STBKTNTT/)).toBeDefined();

      // Modulo 97 verification feedback
      expect(screen.getByText(/Modulo 97 certifié/i)).toBeDefined();
    });

    it('displays live bank detection badge for BIAT', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      const ribInput = screen.getByPlaceholderText(/08 000 0000000000000 18/i);
      fireEvent.change(ribInput, { target: { value: validBiatRib } });

      expect(screen.getByText('BIAT')).toBeDefined();
      expect(screen.getByText(/Banque Internationale Arabe de Tunisie/i)).toBeDefined();
      expect(screen.getByText(/بنك تونس العربي الدولي/)).toBeDefined();
    });

    it('shows error message when RIB checksum is invalid', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      const ribInput = screen.getByPlaceholderText(/08 000 0000000000000 18/i);
      // Use wrong key: '00' instead of stbKey
      const invalidRib = `${stbBase18}00`;
      fireEvent.change(ribInput, { target: { value: invalidRib } });

      expect(screen.getByText(/Clé RIB invalide/i)).toBeDefined();
    });

    it('fills amount via preset buttons and triggers payout request with valid data', async () => {
      const onRequestPayout = vi.fn().mockResolvedValue(undefined);

      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          onRequestPayout={onRequestPayout}
          loading={false}
        />
      );

      // Enter valid RIB
      const ribInput = screen.getByPlaceholderText(/08 000 0000000000000 18/i);
      fireEvent.change(ribInput, { target: { value: validStbRib } });

      // Click preset 200 TND
      const preset200Btn = screen.getByRole('button', { name: '200 TND' });
      fireEvent.click(preset200Btn);

      const amountInput = screen.getByPlaceholderText('Min. 20.000');
      expect(amountInput).toHaveProperty('value', '200');

      // Click submit button
      const submitBtn = screen.getByRole('button', { name: /Initier le Virement Bancaire/i });
      expect(submitBtn).toHaveProperty('disabled', false);

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onRequestPayout).toHaveBeenCalledTimes(1);
        expect(onRequestPayout).toHaveBeenCalledWith(200, `10 001 1234567890123 ${stbKey}`);
      });
    });

    it('prevents submission when amount exceeds available balance', async () => {
      const onRequestPayout = vi.fn().mockResolvedValue(undefined);

      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          onRequestPayout={onRequestPayout}
          loading={false}
        />
      );

      const ribInput = screen.getByPlaceholderText(/08 000 0000000000000 18/i);
      fireEvent.change(ribInput, { target: { value: validStbRib } });

      const amountInput = screen.getByPlaceholderText('Min. 20.000');
      fireEvent.change(amountInput, { target: { value: '5000' } }); // Exceeds 1450.500 TND

      const submitBtn = screen.getByRole('button', { name: /Initier le Virement Bancaire/i });
      expect(submitBtn).toHaveProperty('disabled', true);
      expect(onRequestPayout).not.toHaveBeenCalled();
    });

    it('shows loading state when requestingPayout prop is true', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
          requestingPayout={true}
        />
      );

      expect(screen.getByText(/Traitement SIBTEL en cours/i)).toBeDefined();
    });
  });

  describe('Feature 3: Recent Transaction Flow Cards & Stream', () => {
    it('renders all transaction stream cards with amounts, types, and references', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      expect(screen.getAllByText('Encaissement Vente').length).toBe(2);
      expect(screen.getByText('Virement Bancaire')).toBeDefined();
      expect(screen.getByText('+128.500 TND')).toBeDefined();
      expect(screen.getByText('-500.000 TND')).toBeDefined();
      expect(screen.getByText('ORD-2026-9901')).toBeDefined();
      expect(screen.getByText('SIBTEL-VIR-8821')).toBeDefined();
    });

    it('filters transactions by credit / debit tabs', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      // Filter by "Virements (-)"
      const debitTab = screen.getByRole('button', { name: 'Virements (-)' });
      fireEvent.click(debitTab);

      // Should show withdrawal, not positive revenues
      expect(screen.getByText('-500.000 TND')).toBeDefined();
      expect(screen.queryByText('+128.500 TND')).toBeNull();

      // Filter by "Entrées (+)"
      const creditTab = screen.getByRole('button', { name: 'Entrées (+)' });
      fireEvent.click(creditTab);

      expect(screen.getByText('+128.500 TND')).toBeDefined();
      expect(screen.queryByText('-500.000 TND')).toBeNull();
    });

    it('searches transactions by keyword in reference or type', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Rechercher par référence/i);
      fireEvent.change(searchInput, { target: { value: 'SIBTEL-VIR' } });

      expect(screen.getByText('SIBTEL-VIR-8821')).toBeDefined();
      expect(screen.queryByText('ORD-2026-9901')).toBeNull();
    });

    it('displays empty placeholder when no transactions match', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={[]}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      expect(screen.getByText('Aucune transaction correspondante')).toBeDefined();
    });
  });

  describe('Feature 4: Fiscal Accounting & Rolling Reserve Overview', () => {
    it('renders BCT 7-day rolling reserve notice and timeline', () => {
      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          loading={false}
        />
      );

      expect(screen.getByText(/Réserve Statutaire BCT \(J\+7\)/i)).toBeDefined();
      expect(screen.getByText(/Circulaire Banque Centrale de Tunisie 2020-05/i)).toBeDefined();
      expect(screen.getByText(/Garantie Compensation SIBTEL/i)).toBeDefined();
    });

    it('renders and toggles payout mode between on-demand and automatic', async () => {
      const onPayoutModeChange = vi.fn().mockResolvedValue(undefined);

      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          onPayoutModeChange={onPayoutModeChange}
          loading={false}
        />
      );

      const autoBtn = screen.getByRole('button', { name: /Automatique/i });
      fireEvent.click(autoBtn);

      await waitFor(() => {
        expect(onPayoutModeChange).toHaveBeenCalledTimes(1);
        expect(onPayoutModeChange).toHaveBeenCalledWith('automatic');
      });
    });

    it('renders fiscal accounting readiness checklist when accountingProfile provided', () => {
      const accountingProfile = {
        legal_name: 'Panda Market SARL',
        tax_identifier: '1234567/A/P/000',
        business_registration: 'B01234562024',
        vat_status: 'registered',
        bank_rib: validStbRib,
        bank_name: 'STB',
      };

      render(
        <WalletBentoCockpit
          wallet={mockWallet}
          transactions={mockTransactions}
          onRefresh={vi.fn().mockResolvedValue(undefined)}
          accountingProfile={accountingProfile}
          loading={false}
        />
      );

      expect(screen.getByText(/Conformité Fiscale Tunisienne/i)).toBeDefined();
      expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Matricule Fiscal (NIF)')).toBeDefined();
      expect(screen.getByText('Registre de Commerce (RNE)')).toBeDefined();
    });
  });
});
