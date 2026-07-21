import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdsPerformanceCharts } from '../components/dashboard/AdsPerformanceCharts';

const daily = [
  { stat_date: '2026-07-01', impressions: '100', clicks: '5', conversions: '1', spend: '1.500', revenue: '8.000' },
  { stat_date: '2026-07-02', impressions: '150', clicks: '9', conversions: '2', spend: '2.250', revenue: '15.000' },
];

describe('AdsPerformanceCharts', () => {
  it('renders a clear empty state when the selected period has no data', () => {
    render(<AdsPerformanceCharts daily={[]} />);
    expect(screen.getByText('No performance data for this period.')).toBeInTheDocument();
  });

  it('renders accessible reach and revenue charts', () => {
    render(<AdsPerformanceCharts daily={daily} />);
    expect(screen.getByRole('img', { name: /Reach and engagement from 2026-07-01 to 2026-07-02/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Spend and attributed revenue from 2026-07-01 to 2026-07-02/ })).toBeInTheDocument();
    expect(screen.getByText('Impressions')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('keeps chronological chart axes left-to-right inside RTL dashboards', () => {
    const { container } = render(<div dir="rtl"><AdsPerformanceCharts daily={daily} /></div>);
    const charts = container.querySelectorAll('svg');
    expect(charts).toHaveLength(2);
    charts.forEach((chart) => expect(chart.parentElement).toHaveAttribute('dir', 'ltr'));
    container.querySelectorAll('figure > div:last-child').forEach((axis) => {
      expect(axis).toHaveAttribute('dir', 'ltr');
    });
  });
});
