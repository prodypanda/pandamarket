import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LocaleProvider } from '../contexts/LocaleContext';
import { AdsCampaignWizard } from '../components/dashboard/AdsCampaignWizard';
import { fetchWithCsrf } from '@/lib/api';

vi.mock('../components/dashboard/AdsCreativeMediaPicker', () => ({
  AdsCreativeMediaPicker: () => null,
}));
vi.mock('@/lib/api', () => ({ fetchWithCsrf: vi.fn() }));

const placements = [{ id: 'search', name: 'Search top results', format: 'product_card', default_price: '0.200' }];
const props = () => ({ placements, onClose: vi.fn(), onCreated: vi.fn().mockResolvedValue(undefined), onError: vi.fn() });

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('AdsCampaignWizard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.clearAllMocks();
    (fetchWithCsrf as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ products: [] }),
    });
  });

  it('blocks setup progression until campaign name and budgets are valid', () => {
    renderWithLocale(<AdsCampaignWizard {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/ads\.wizard\.validSetupErr|Enter a name/i);
    expect(screen.getByText('Campaign setup')).toBeInTheDocument();
  });

  it('preselects the product supplied by a Sponsor or Boost deep link', () => {
    renderWithLocale(<AdsCampaignWizard {...props()} productId="pd_product_boosted" />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Boost listing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText(/Product \/ Service ID/i)).toHaveValue('pd_product_boosted');
  });

  it('saves wizard progress locally and restores it on remount', () => {
    const first = renderWithLocale(<AdsCampaignWizard {...props()} />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Saved campaign' } });
    act(() => vi.advanceTimersByTime(300));
    first.unmount();

    renderWithLocale(<AdsCampaignWizard {...props()} />);
    expect(screen.getByText('Saved progress restored.')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign name')).toHaveValue('Saved campaign');
  });

  it('allows sellers to discard restored progress', () => {
    localStorage.setItem('pandamarket:ads-wizard-draft:v1', JSON.stringify({ form: { name: 'Old draft' }, step: 0 }));
    renderWithLocale(<AdsCampaignWizard {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByText('Saved progress restored.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Campaign name')).toHaveValue('');
    expect(localStorage.getItem('pandamarket:ads-wizard-draft:v1')).toBeNull();
  });
});
