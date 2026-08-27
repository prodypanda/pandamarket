import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourierConsolePage from '../app/courier/page';

describe('PLAN-T4-02: Cash on Delivery (COD) Driver & Courier Mobile Console', () => {
  it('renders driver package manifest and initial cash tally balance', () => {
    render(<CourierConsolePage />);

    expect(screen.getByText(/PandaMarket Livreur/i)).toBeDefined();
    expect(screen.getByText(/Bilan Caisse Espèces/i)).toBeDefined();
    expect(screen.getByText(/Sami Mansour/i)).toBeDefined();
    expect(screen.getByText(/Fatma Ben Ali/i)).toBeDefined();
  });

  it('opens delivery OTP modal and completes delivery handshake', async () => {
    render(<CourierConsolePage />);

    const validateButtons = screen.getAllByRole('button', { name: /Valider Livraison/i });
    fireEvent.click(validateButtons[0]);

    expect(screen.getByText(/Validation de Remise/i)).toBeDefined();
    expect(screen.getByText(/Code OTP \(4 chiffres\)/i)).toBeDefined();

    const otpInput = screen.getByPlaceholderText('1 2 3 4');
    fireEvent.change(otpInput, { target: { value: '8821' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirmer & Encaisser/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Validation de Remise/i)).toBeNull();
    });
  });
});
