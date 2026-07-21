import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../components/dashboard/AdsCreativeMediaPicker', () => ({
  AdsCreativeMediaPicker: () => null,
}));
vi.mock('@/lib/api', () => ({ fetchWithCsrf: vi.fn() }));

import { AdsCampaignWizard } from '../components/dashboard/AdsCampaignWizard';

const placements = [{ id: 'search', name: 'Search top results', format: 'product_card', default_price: '0.200' }];
const props = () => ({ placements, onClose: vi.fn(), onCreated: vi.fn().mockResolvedValue(undefined), onError: vi.fn() });

describe('AdsCampaignWizard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('blocks setup progression until campaign name and budgets are valid', () => {
    render(<AdsCampaignWizard {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a name and valid budgets.');
    expect(screen.getByText('Campaign setup')).toBeInTheDocument();
  });

  it('preselects the product supplied by a Sponsor or Boost deep link', () => {
    render(<AdsCampaignWizard {...props()} productId="pd_product_boosted" />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Boost listing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Product/service ID')).toHaveValue('pd_product_boosted');
  });

  it('saves wizard progress locally and restores it on remount', () => {
    const first = render(<AdsCampaignWizard {...props()} />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Saved campaign' } });
    act(() => vi.advanceTimersByTime(300));
    first.unmount();

    render(<AdsCampaignWizard {...props()} />);
    expect(screen.getByText('Saved progress restored.')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign name')).toHaveValue('Saved campaign');
  });

  it('allows sellers to discard restored progress', () => {
    localStorage.setItem('pandamarket:ads-wizard-draft:v1', JSON.stringify({ form: { name: 'Old draft' }, step: 0 }));
    render(<AdsCampaignWizard {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByText('Saved progress restored.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Campaign name')).toHaveValue('');
    expect(localStorage.getItem('pandamarket:ads-wizard-draft:v1')).toBeNull();
  });
});
