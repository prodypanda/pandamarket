import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TermsPage from '../app/terms/page';
import PrivacyPage from '../app/privacy/page';
import ReturnsPage from '../app/returns/page';
import SellerAgreementPage from '../app/seller-agreement/page';

describe('PLAN-M-12: Legal & Compliance Policy CMS', () => {
  it('renders Terms of Service (CGU) page properly', () => {
    render(<TermsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Conditions Générales d'Utilisation/i })).toBeDefined();
    expect(screen.getByText(/Loi tunisienne N° 2000-83/i)).toBeDefined();
  });

  it('renders Privacy Policy page conforming to PDP Law 2004-63', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Politique de Confidentialité/i })).toBeDefined();
    expect(screen.getByText(/Loi Organique n° 2004-63/i)).toBeDefined();
  });

  it('renders Returns and Refund Policy page', () => {
    render(<ReturnsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Politique de Remboursement & Retours/i })).toBeDefined();
    expect(screen.getAllByText(/10 Jours Ouvrables/i).length).toBeGreaterThan(0);
  });

  it('renders Seller Agreement Contract page', () => {
    render(<SellerAgreementPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Contrat Vendeur Marketplace/i })).toBeDefined();
    expect(screen.getByText(/Registre National des Entreprises/i)).toBeDefined();
  });
});
