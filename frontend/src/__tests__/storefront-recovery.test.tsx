import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StorefrontRecoveryPage } from '../components/store/StorefrontRecoveryPage';
import { fetchWithCsrf } from '../lib/api';

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
let queryString = '';

vi.mock('../lib/api', () => ({ fetchWithCsrf: vi.fn() }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ storeHost: 'boutique1' }),
  useSearchParams: () => new URLSearchParams(queryString),
  useRouter: () => router,
}));

const mockedFetch = vi.mocked(fetchWithCsrf);

function storeResponse() {
  return new Response(JSON.stringify({
    store: { id: 'store_1', name: 'Boutique 1', settings: { colors: { primary: '#16a34a' } } },
  }), { status: 200 });
}

beforeEach(() => {
  queryString = '';
  router.replace.mockReset();
  router.refresh.mockReset();
  router.push.mockReset();
  mockedFetch.mockReset();
});

describe('tenant storefront recovery', () => {
  it('submits forgot-password with the store loaded from the tenant host and keeps the response generic', async () => {
    mockedFetch
      .mockResolvedValueOnce(storeResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    render(<StorefrontRecoveryPage mode="forgot" />);
    await screen.findByText('Boutique 1');

    fireEvent.change(screen.getByLabelText('Adresse email'), { target: { value: 'buyer@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Si un compte existe'));
    expect(mockedFetch).toHaveBeenLastCalledWith('/api/pd/storefront/auth/forgot-password', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ store_id: 'store_1', email: 'buyer@test.com' }),
    }));
  });

  it('blocks a token link whose store_id does not match the current tenant', async () => {
    queryString = 'store_id=store_other&token=tenant-token';
    mockedFetch.mockResolvedValueOnce(storeResponse());

    render(<StorefrontRecoveryPage mode="reset" />);
    expect(await screen.findByText(/Ce lien appartient à une autre boutique/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réinitialiser le mot de passe' })).toBeDisabled();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('verifies a tenant token automatically and exposes a resend path', async () => {
    queryString = 'store_id=store_1&token=tenant-token&next=%2Fcheckout';
    mockedFetch
      .mockResolvedValueOnce(storeResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    render(<StorefrontRecoveryPage mode="verify" />);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Votre adresse email est vérifiée'));
    expect(mockedFetch).toHaveBeenLastCalledWith('/api/pd/storefront/auth/verify-email', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ store_id: 'store_1', token: 'tenant-token' }),
    }));
  });
});
