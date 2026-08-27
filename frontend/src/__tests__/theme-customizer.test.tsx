import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeCustomizerPage from '../app/hub/dashboard/themes/customize/page';

describe('PLAN-M-14: Visual Storefront Theme Customizer & Real-Time CSS Live Preview', () => {
  it('renders theme customizer tabs and initial live preview elements', () => {
    render(<ThemeCustomizerPage />);
    expect(screen.getByText(/Personnaliseur de Thème/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Couleurs/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Typographie/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /En-tête & Bannière/i })).toBeDefined();

    // Verify initial announcement bar in live preview pane
    expect(screen.getByText(/Livraison gratuite sur toute la Tunisie/i)).toBeDefined();
  });

  it('switches tabs and updates header announcement text in live preview', () => {
    render(<ThemeCustomizerPage />);

    // Switch to Header & Banner tab
    const headerTab = screen.getByRole('button', { name: /En-tête & Bannière/i });
    fireEvent.click(headerTab);

    // Change announcement text
    const announcementInput = screen.getByDisplayValue(/Livraison gratuite sur toute la Tunisie/i);
    fireEvent.change(announcementInput, { target: { value: 'Remise de -20% pour le Black Friday !' } });

    expect(screen.getByText('Remise de -20% pour le Black Friday !')).toBeDefined();
  });
});
