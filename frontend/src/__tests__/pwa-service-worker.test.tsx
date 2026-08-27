import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import manifest from '../app/manifest';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';

describe('PLAN-T4-04: Storefront Offline Progressive Web App (PWA)', () => {
  it('generates valid PWA web app manifest configuration', () => {
    const meta = manifest();
    expect(meta.name).toContain('PandaMarket');
    expect(meta.display).toBe('standalone');
    expect(meta.start_url).toBe('/');
    expect(meta.theme_color).toBe('#059669');
  });

  it('renders PWA install prompt when beforeinstallprompt event is dispatched', () => {
    const mockRegister = vi.fn().mockResolvedValue({});
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { register: mockRegister },
      writable: true,
      configurable: true,
    });

    render(<PwaInstallPrompt />);

    // Trigger beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = vi.fn();
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    expect(screen.getByText(/Installer PandaMarket/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Installer/i })).toBeDefined();
  });
});
